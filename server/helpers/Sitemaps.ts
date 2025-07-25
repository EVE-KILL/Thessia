import { writeFile, mkdir, readdir, stat } from "node:fs/promises";
import { join } from "node:path";
import { existsSync } from "node:fs";
import { gzip } from "node:zlib";
import { promisify } from "node:util";

const gzipAsync = promisify(gzip);

export const SITEMAP_MAX_URLS = 50000; // Google's limit for URLs per sitemap
export const SITE_URL = "https://eve-kill.com";

// Dynamically determine sitemaps directory based on environment
export const SITEMAPS_DIR = process.env.THESSIA_CONTAINER
    ? join(process.cwd(), "public/sitemaps") // Container environment
    : join(process.cwd(), "src/theme/modern/public/sitemaps"); // Development environment

export interface SitemapUrl {
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
export function generateSitemapXML(urls: SitemapUrl[]): string {
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
export function generateSitemapIndexXML(
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
export async function ensureDir(dirPath: string): Promise<void> {
    if (!existsSync(dirPath)) {
        await mkdir(dirPath, { recursive: true });
    }
}

/**
 * Write sitemap file and return the filename and relative path
 */
export async function writeSitemapFile(
    category: string,
    urls: SitemapUrl[],
    filename: string,
    logger?: any
): Promise<{ filename: string; relativePath: string }> {
    const categoryDir = join(SITEMAPS_DIR, category);
    await ensureDir(categoryDir);

    // For date-based files, create year/month subdirectories
    const isDateBased =
        filename.includes("-") && filename.match(/\d{4}-\d{2}-\d{2}/);
    let filePath: string;
    let relativePath: string;

    if (isDateBased) {
        const datePart = filename.match(/(\d{4})-(\d{2})-(\d{2})/);
        if (datePart) {
            const [, year, month] = datePart;
            const yearMonthDir = join(categoryDir, year, month);
            await ensureDir(yearMonthDir);
            filePath = join(yearMonthDir, `${filename}.xml.gz`);
            relativePath = `${category}/${year}/${month}/${filename}.xml.gz`;
        } else {
            filePath = join(categoryDir, `${filename}.xml.gz`);
            relativePath = `${category}/${filename}.xml.gz`;
        }
    } else {
        filePath = join(categoryDir, `${filename}.xml.gz`);
        relativePath = `${category}/${filename}.xml.gz`;
    }

    const xmlContent = generateSitemapXML(urls);
    const compressedContent = await gzipAsync(xmlContent);
    await writeFile(filePath, compressedContent);

    if (logger) {
        const originalSize = Buffer.byteLength(xmlContent, "utf8");
        const compressedSize = compressedContent.length;
        const compressionRatio = (
            (1 - compressedSize / originalSize) *
            100
        ).toFixed(1);

        logger.info(
            `✅ Written ${filename}.xml.gz with ${urls.length} URLs (${(
                originalSize /
                1024 /
                1024
            ).toFixed(2)}MB → ${(compressedSize / 1024 / 1024).toFixed(
                2
            )}MB, ${compressionRatio}% compression)`
        );
    }

    return {
        filename: `${filename}.xml.gz`,
        relativePath,
    };
}

/**
 * Write sitemap index file
 */
export async function writeSitemapIndex(
    category: string,
    sitemapFiles: {
        filename: string;
        relativePath: string;
        lastmod?: string;
    }[],
    logger?: any
): Promise<void> {
    const indexPath = join(SITEMAPS_DIR, `${category}.xml.gz`);
    const sitemaps = sitemapFiles.map((file) => ({
        loc: `${SITE_URL}/sitemaps/${file.relativePath}`,
        lastmod: file.lastmod || new Date().toISOString().split("T")[0],
    }));

    const xmlContent = generateSitemapIndexXML(sitemaps);
    const compressedContent = await gzipAsync(xmlContent);

    await writeFile(indexPath, compressedContent);

    if (logger) {
        logger.info(
            `📋 Written ${category}.xml.gz index with ${sitemapFiles.length} sitemaps`
        );
    }
}

/**
 * Write sitemap index file by scanning disk for existing files
 */
export async function writeSitemapIndexFromDisk(
    category: string,
    logger?: any
): Promise<void> {
    const categoryDir = join(SITEMAPS_DIR, category);

    // Always ensure the category directory exists
    await ensureDir(categoryDir);

    const sitemapFiles: {
        filename: string;
        relativePath: string;
        lastmod?: string;
    }[] = [];

    // Only scan if directory exists and has files
    if (existsSync(categoryDir)) {
        // Recursively scan the category directory for .xml.gz files
        async function scanDirectory(
            dirPath: string,
            relativeBase: string
        ): Promise<void> {
            try {
                const entries = await readdir(dirPath, { withFileTypes: true });

                for (const entry of entries) {
                    const fullPath = join(dirPath, entry.name);
                    const relativePath = join(relativeBase, entry.name);

                    if (entry.isDirectory()) {
                        // Recursively scan subdirectories
                        await scanDirectory(fullPath, relativePath);
                    } else if (
                        entry.isFile() &&
                        entry.name.endsWith(".xml.gz")
                    ) {
                        // Get file stats for lastmod
                        const stats = await stat(fullPath);
                        const lastmod = formatDate(stats.mtime);

                        sitemapFiles.push({
                            filename: entry.name,
                            relativePath: relativePath.replace(/\\/g, "/"), // Normalize path separators
                            lastmod,
                        });
                    }
                }
            } catch (error) {
                if (logger) {
                    logger.warn(
                        `⚠️ Error reading directory ${dirPath}: ${error}`
                    );
                }
            }
        }

        await scanDirectory(categoryDir, category);

        // Sort files by filename for consistent ordering
        sitemapFiles.sort((a, b) => a.filename.localeCompare(b.filename));
    }

    // Always write the index file, even if no sitemap files were found
    // This ensures the index file exists and is valid (albeit empty)
    await writeSitemapIndex(category, sitemapFiles, logger);

    if (logger && sitemapFiles.length === 0) {
        logger.info(
            `📋 Created empty ${category}.xml.gz index (no sitemap files found)`
        );
    }
}

/**
 * Generate main sitemap index
 */
export async function generateMainSitemapIndex(
    categories: string[],
    logger?: any
): Promise<void> {
    if (logger) {
        logger.info("📋 Generating main sitemap index...");
    }

    const sitemaps = categories.map((category) => ({
        loc: `${SITE_URL}/sitemaps/${category}.xml.gz`,
        lastmod: new Date().toISOString().split("T")[0],
    }));

    const indexPath = join(SITEMAPS_DIR, "index.xml.gz");
    const xmlContent = generateSitemapIndexXML(sitemaps);
    const compressedContent = await gzipAsync(xmlContent);

    await writeFile(indexPath, compressedContent);

    if (logger) {
        logger.info(
            `✅ Main sitemap index written with ${categories.length} category sitemaps`
        );
    }
}

/**
 * Format date as YYYY-MM-DD
 */
export function formatDate(date: Date): string {
    return date.toISOString().split("T")[0];
}

/**
 * Get the next day
 */
export function getNextDay(date: Date): Date {
    const nextDay = new Date(date);
    nextDay.setUTCDate(nextDay.getUTCDate() + 1);
    return nextDay;
}

/**
 * Get start and end of day in UTC
 */
export function getDayBounds(date: Date): { start: Date; end: Date } {
    const start = new Date(date);
    start.setUTCHours(0, 0, 0, 0);

    const end = new Date(date);
    end.setUTCHours(23, 59, 59, 999);

    return { start, end };
}
