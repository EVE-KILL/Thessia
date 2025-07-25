import { cliLogger } from "~/server/helpers/Logger";
import { Killmails } from "~/server/models/Killmails";
import { Battles } from "~/server/models/Battles";
import { Campaigns } from "~/server/models/Campaigns";
import { Characters } from "~/server/models/Characters";
import { Corporations } from "~/server/models/Corporations";
import { Alliances } from "~/server/models/Alliances";
import { writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";
import { existsSync } from "node:fs";
import { gzip } from "node:zlib";
import { promisify } from "node:util";

const gzipAsync = promisify(gzip);

const SITEMAP_MAX_URLS = 50000; // Google's limit for URLs per sitemap
const SITE_URL = "https://eve-kill.com";

// Dynamically determine sitemaps directory based on environment
const SITEMAPS_DIR = process.env.THESSIA_CONTAINER 
    ? join(process.cwd(), "public/sitemaps")           // Container environment
    : join(process.cwd(), "src/theme/modern/public/sitemaps"); // Development environment

interface SitemapUrl {
    loc: string;
    lastmod?: string;
    changefreq?:
        | "always"
        | "hourly"
        | "daily"
        | "weekly"
        | "monthly"
        | "yearly"
        | "never";
    priority?: number;
}

/**
 * Generate XML content for a sitemap
 */
function generateSitemapXML(urls: SitemapUrl[]): string {
    const urlElements = urls
        .map((url) => {
            let urlXml = `    <url>\n        <loc>${url.loc}</loc>\n`;
            if (url.lastmod) {
                urlXml += `        <lastmod>${url.lastmod}</lastmod>\n`;
            }
            if (url.changefreq) {
                urlXml += `        <changefreq>${url.changefreq}</changefreq>\n`;
            }
            if (url.priority !== undefined) {
                urlXml += `        <priority>${url.priority}</priority>\n`;
            }
            urlXml += `    </url>`;
            return urlXml;
        })
        .join("\n");

    return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urlElements}
</urlset>`;
}

/**
 * Generate XML content for a sitemap index
 */
function generateSitemapIndexXML(
    sitemaps: { loc: string; lastmod?: string }[]
): string {
    const sitemapElements = sitemaps
        .map((sitemap) => {
            let sitemapXml = `    <sitemap>\n        <loc>${sitemap.loc}</loc>\n`;
            if (sitemap.lastmod) {
                sitemapXml += `        <lastmod>${sitemap.lastmod}</lastmod>\n`;
            }
            sitemapXml += `    </sitemap>`;
            return sitemapXml;
        })
        .join("\n");

    return `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${sitemapElements}
</sitemapindex>`;
}

/**
 * Ensure directory exists
 */
async function ensureDir(dirPath: string): Promise<void> {
    if (!existsSync(dirPath)) {
        await mkdir(dirPath, { recursive: true });
        cliLogger.info(`📁 Created directory: ${dirPath}`);
    }
}

/**
 * Write sitemap file and return the filename
 */
async function writeSitemapFile(
    category: string,
    urls: SitemapUrl[],
    chunkIndex?: number
): Promise<string> {
    const baseFilename =
        chunkIndex !== undefined
            ? `${category}-${chunkIndex.toString().padStart(4, "0")}`
            : `${category}`;

    const filename = `${baseFilename}.xml.gz`; // Always compress
    const filePath = join(SITEMAPS_DIR, category, filename);
    const xmlContent = generateSitemapXML(urls);

    // Compress the XML content
    const compressedContent = await gzipAsync(xmlContent);

    await writeFile(filePath, compressedContent);

    const originalSize = Buffer.byteLength(xmlContent, "utf8");
    const compressedSize = compressedContent.length;
    const compressionRatio = (
        (1 - compressedSize / originalSize) *
        100
    ).toFixed(1);

    cliLogger.info(
        `✅ Written ${filename} with ${urls.length} URLs (${(
            originalSize /
            1024 /
            1024
        ).toFixed(2)}MB → ${(compressedSize / 1024 / 1024).toFixed(
            2
        )}MB, ${compressionRatio}% compression)`
    );

    return filename;
}

/**
 * Write sitemap index file
 */
async function writeSitemapIndex(
    category: string,
    sitemapFiles: string[]
): Promise<void> {
    const indexPath = join(SITEMAPS_DIR, `${category}.xml.gz`);
    const sitemaps = sitemapFiles.map((file) => ({
        loc: `${SITE_URL}/sitemaps/${category}/${file}`,
        lastmod: new Date().toISOString().split("T")[0],
    }));

    const xmlContent = generateSitemapIndexXML(sitemaps);
    const compressedContent = await gzipAsync(xmlContent);

    await writeFile(indexPath, compressedContent);
    cliLogger.info(
        `📋 Written ${category}.xml.gz index with ${sitemapFiles.length} sitemaps`
    );
}

/**
 * Generate killmail sitemaps - chunked by date ranges due to massive volume
 */
async function generateKillmailSitemaps(): Promise<string[]> {
    cliLogger.info("🔪 Starting killmail sitemap generation...");

    const categoryDir = join(SITEMAPS_DIR, "killmails");
    await ensureDir(categoryDir);

    const sitemapFiles: string[] = [];
    let chunkIndex = 0;
    let currentUrls: SitemapUrl[] = [];

    // Get total count for progress tracking
    const totalCount = await Killmails.estimatedDocumentCount({});
    cliLogger.info(
        `📊 Total killmails to process: ${totalCount.toLocaleString()}`
    );

    let processed = 0;
    const batchSize = 10000;

    // Use cursor for memory efficiency - Remove sort to start immediately
    // Sorting 89M records takes forever, we'll just process in natural order
    const cursor = Killmails.find({}, { killmail_id: 1, kill_time: 1 }).cursor({
        batchSize,
    });

    for (
        let doc = await cursor.next();
        doc != null;
        doc = await cursor.next()
    ) {
        currentUrls.push({
            loc: `${SITE_URL}/kill/${doc.killmail_id}`,
            lastmod: doc.kill_time
                ? new Date(doc.kill_time).toISOString().split("T")[0]
                : undefined,
            changefreq: "never", // Killmails don't change after creation
            priority: 0.7,
        });

        processed++;

        // Write chunk when we reach the limit
        if (currentUrls.length >= SITEMAP_MAX_URLS) {
            const filename = await writeSitemapFile(
                "killmails",
                currentUrls,
                chunkIndex
            );
            sitemapFiles.push(filename);
            currentUrls = [];
            chunkIndex++;
        }

        // Progress logging
        if (processed % 100000 === 0) {
            const percentage = ((processed / totalCount) * 100).toFixed(1);
            cliLogger.info(
                `⏳ Processed ${processed.toLocaleString()}/${totalCount.toLocaleString()} killmails (${percentage}%)`
            );
        }
    }

    // Write remaining URLs
    if (currentUrls.length > 0) {
        const filename = await writeSitemapFile(
            "killmails",
            currentUrls,
            chunkIndex
        );
        sitemapFiles.push(filename);
    }

    cliLogger.info(
        `✅ Killmail sitemaps completed: ${
            sitemapFiles.length
        } files, ${processed.toLocaleString()} URLs`
    );
    return sitemapFiles;
}

/**
 * Generate battle sitemaps
 */
async function generateBattleSitemaps(): Promise<string[]> {
    cliLogger.info("⚔️ Starting battle sitemap generation...");

    const categoryDir = join(SITEMAPS_DIR, "battles");
    await ensureDir(categoryDir);

    const sitemapFiles: string[] = [];
    let chunkIndex = 0;
    let currentUrls: SitemapUrl[] = [];

    const totalCount = await Battles.estimatedDocumentCount({});
    cliLogger.info(
        `📊 Total battles to process: ${totalCount.toLocaleString()}`
    );

    let processed = 0;

    const cursor = Battles.find({}, { battle_id: 1, end_time: 1 })
        .sort({ end_time: -1 })
        .cursor({ batchSize: 5000 });

    for (
        let doc = await cursor.next();
        doc != null;
        doc = await cursor.next()
    ) {
        currentUrls.push({
            loc: `${SITE_URL}/battle/${doc.battle_id}`,
            lastmod: doc.end_time
                ? new Date(doc.end_time).toISOString().split("T")[0]
                : undefined,
            changefreq: "never", // Battles don't change after completion
            priority: 0.8,
        });

        processed++;

        if (currentUrls.length >= SITEMAP_MAX_URLS) {
            const filename = await writeSitemapFile(
                "battles",
                currentUrls,
                chunkIndex
            );
            sitemapFiles.push(filename);
            currentUrls = [];
            chunkIndex++;
        }

        if (processed % 10000 === 0) {
            const percentage = ((processed / totalCount) * 100).toFixed(1);
            cliLogger.info(
                `⏳ Processed ${processed.toLocaleString()}/${totalCount.toLocaleString()} battles (${percentage}%)`
            );
        }
    }

    if (currentUrls.length > 0) {
        const filename = await writeSitemapFile(
            "battles",
            currentUrls,
            chunkIndex
        );
        sitemapFiles.push(filename);
    }

    cliLogger.info(
        `✅ Battle sitemaps completed: ${
            sitemapFiles.length
        } files, ${processed.toLocaleString()} URLs`
    );
    return sitemapFiles;
}

/**
 * Generate campaign sitemaps
 */
async function generateCampaignSitemaps(): Promise<string[]> {
    cliLogger.info("🎯 Starting campaign sitemap generation...");

    const categoryDir = join(SITEMAPS_DIR, "campaigns");
    await ensureDir(categoryDir);

    const campaigns = await Campaigns.find(
        { public: true }, // Only public campaigns
        { campaign_id: 1, processing_completed_at: 1, last_processed_at: 1 }
    ).sort({ processing_completed_at: -1 });

    const urls: SitemapUrl[] = campaigns.map((campaign) => ({
        loc: `${SITE_URL}/campaigns/${campaign.campaign_id}`,
        lastmod: campaign.processing_completed_at
            ? new Date(campaign.processing_completed_at)
                  .toISOString()
                  .split("T")[0]
            : campaign.last_processed_at
            ? new Date(campaign.last_processed_at).toISOString().split("T")[0]
            : undefined,
        changefreq: "weekly", // Campaigns might get updated
        priority: 0.6,
    }));

    const filename = await writeSitemapFile("campaigns", urls);
    cliLogger.info(
        `✅ Campaign sitemaps completed: 1 file, ${urls.length} URLs`
    );
    return [filename];
}

/**
 * Generate character sitemaps
 */
async function generateCharacterSitemaps(): Promise<string[]> {
    cliLogger.info("👤 Starting character sitemap generation...");

    const categoryDir = join(SITEMAPS_DIR, "characters");
    await ensureDir(categoryDir);

    const sitemapFiles: string[] = [];
    let chunkIndex = 0;
    let currentUrls: SitemapUrl[] = [];

    const totalCount = await Characters.estimatedDocumentCount({});
    cliLogger.info(
        `📊 Total characters to process: ${totalCount.toLocaleString()}`
    );

    let processed = 0;

    const cursor = Characters.find({}, { character_id: 1, updatedAt: 1 })
        .sort({ character_id: 1 })
        .cursor({ batchSize: 10000 });

    for (
        let doc = await cursor.next();
        doc != null;
        doc = await cursor.next()
    ) {
        currentUrls.push({
            loc: `${SITE_URL}/character/${doc.character_id}`,
            lastmod: doc.updatedAt
                ? new Date(doc.updatedAt).toISOString().split("T")[0]
                : undefined,
            changefreq: "monthly", // Character pages get updated periodically
            priority: 0.5,
        });

        processed++;

        if (currentUrls.length >= SITEMAP_MAX_URLS) {
            const filename = await writeSitemapFile(
                "characters",
                currentUrls,
                chunkIndex
            );
            sitemapFiles.push(filename);
            currentUrls = [];
            chunkIndex++;
        }

        if (processed % 50000 === 0) {
            const percentage = ((processed / totalCount) * 100).toFixed(1);
            cliLogger.info(
                `⏳ Processed ${processed.toLocaleString()}/${totalCount.toLocaleString()} characters (${percentage}%)`
            );
        }
    }

    if (currentUrls.length > 0) {
        const filename = await writeSitemapFile(
            "characters",
            currentUrls,
            chunkIndex
        );
        sitemapFiles.push(filename);
    }

    cliLogger.info(
        `✅ Character sitemaps completed: ${
            sitemapFiles.length
        } files, ${processed.toLocaleString()} URLs`
    );
    return sitemapFiles;
}

/**
 * Generate corporation sitemaps
 */
async function generateCorporationSitemaps(): Promise<string[]> {
    cliLogger.info("🏢 Starting corporation sitemap generation...");

    const categoryDir = join(SITEMAPS_DIR, "corporations");
    await ensureDir(categoryDir);

    const sitemapFiles: string[] = [];
    let chunkIndex = 0;
    let currentUrls: SitemapUrl[] = [];

    const totalCount = await Corporations.estimatedDocumentCount({});
    cliLogger.info(
        `📊 Total corporations to process: ${totalCount.toLocaleString()}`
    );

    let processed = 0;

    const cursor = Corporations.find({}, { corporation_id: 1, updatedAt: 1 })
        .sort({ corporation_id: 1 })
        .cursor({ batchSize: 10000 });

    for (
        let doc = await cursor.next();
        doc != null;
        doc = await cursor.next()
    ) {
        currentUrls.push({
            loc: `${SITE_URL}/corporation/${doc.corporation_id}`,
            lastmod: doc.updatedAt
                ? new Date(doc.updatedAt).toISOString().split("T")[0]
                : undefined,
            changefreq: "monthly",
            priority: 0.5,
        });

        processed++;

        if (currentUrls.length >= SITEMAP_MAX_URLS) {
            const filename = await writeSitemapFile(
                "corporations",
                currentUrls,
                chunkIndex
            );
            sitemapFiles.push(filename);
            currentUrls = [];
            chunkIndex++;
        }

        if (processed % 25000 === 0) {
            const percentage = ((processed / totalCount) * 100).toFixed(1);
            cliLogger.info(
                `⏳ Processed ${processed.toLocaleString()}/${totalCount.toLocaleString()} corporations (${percentage}%)`
            );
        }
    }

    if (currentUrls.length > 0) {
        const filename = await writeSitemapFile(
            "corporations",
            currentUrls,
            chunkIndex
        );
        sitemapFiles.push(filename);
    }

    cliLogger.info(
        `✅ Corporation sitemaps completed: ${
            sitemapFiles.length
        } files, ${processed.toLocaleString()} URLs`
    );
    return sitemapFiles;
}

/**
 * Generate alliance sitemaps
 */
async function generateAllianceSitemaps(): Promise<string[]> {
    cliLogger.info("🤝 Starting alliance sitemap generation...");

    const categoryDir = join(SITEMAPS_DIR, "alliances");
    await ensureDir(categoryDir);

    const alliances = await Alliances.find(
        {},
        { alliance_id: 1, updatedAt: 1 }
    ).sort({ alliance_id: 1 });

    const urls: SitemapUrl[] = alliances.map((alliance) => ({
        loc: `${SITE_URL}/alliance/${alliance.alliance_id}`,
        lastmod: alliance.updatedAt
            ? new Date(alliance.updatedAt).toISOString().split("T")[0]
            : undefined,
        changefreq: "monthly",
        priority: 0.6,
    }));

    const filename = await writeSitemapFile("alliances", urls);
    cliLogger.info(
        `✅ Alliance sitemaps completed: 1 file, ${urls.length} URLs`
    );
    return [filename];
}

/**
 * Generate main sitemap index
 */
async function generateMainSitemapIndex(): Promise<void> {
    cliLogger.info("📋 Generating main sitemap index...");

    const categories = [
        "killmails",
        "battles",
        "campaigns",
        "characters",
        "corporations",
        "alliances",
    ];
    const sitemaps = categories.map((category) => ({
        loc: `${SITE_URL}/sitemaps/${category}.xml.gz`,
        lastmod: new Date().toISOString().split("T")[0],
    }));

    const indexPath = join(SITEMAPS_DIR, "index.xml.gz");
    const xmlContent = generateSitemapIndexXML(sitemaps);
    const compressedContent = await gzipAsync(xmlContent);

    await writeFile(indexPath, compressedContent);

    cliLogger.info(
        `✅ Main sitemap index written with ${categories.length} category sitemaps`
    );
}

export default {
    name: "generateSitemaps",
    description:
        "Generate sitemaps for killmails, battles, campaigns, characters, corporations and alliances",
    longRunning: false,
    run: async () => {
        const startTime = Date.now();
        cliLogger.info("🗺️ Starting sitemap generation process...");

        try {
            // Ensure main sitemaps directory exists
            await ensureDir(SITEMAPS_DIR);

            // Generate sitemaps for each category
            const killmailFiles = await generateKillmailSitemaps();
            await writeSitemapIndex("killmails", killmailFiles);

            const battleFiles = await generateBattleSitemaps();
            await writeSitemapIndex("battles", battleFiles);

            const campaignFiles = await generateCampaignSitemaps();
            await writeSitemapIndex("campaigns", campaignFiles);

            const characterFiles = await generateCharacterSitemaps();
            await writeSitemapIndex("characters", characterFiles);

            const corporationFiles = await generateCorporationSitemaps();
            await writeSitemapIndex("corporations", corporationFiles);

            const allianceFiles = await generateAllianceSitemaps();
            await writeSitemapIndex("alliances", allianceFiles);

            // Generate main index
            await generateMainSitemapIndex();

            const endTime = Date.now();
            const duration = (endTime - startTime) / 1000 / 60; // minutes

            cliLogger.info("🎉 Sitemap generation completed successfully!");
            cliLogger.info(
                `⏱️ Total time taken: ${duration.toFixed(2)} minutes`
            );
            cliLogger.info(
                `📁 Sitemaps have been written to: ${SITEMAPS_DIR}`
            );
            cliLogger.info(
                "💡 Don't forget to update robots.txt to reference the new sitemaps!"
            );
        } catch (error) {
            cliLogger.error(`💥 Error during sitemap generation: ${error}`);
            throw error;
        }
    },
};
