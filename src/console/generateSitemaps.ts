import { cliLogger } from "~/server/helpers/Logger";
import { Killmails } from "~/server/models/Killmails";
import { Battles } from "~/server/models/Battles";
import { Campaigns } from "~/server/models/Campaigns";
import { Characters } from "~/server/models/Characters";
import { Corporations } from "~/server/models/Corporations";
import { Alliances } from "~/server/models/Alliances";
import { join } from "node:path";
import {
    SITEMAP_MAX_URLS,
    SITE_URL,
    SITEMAPS_DIR,
    SitemapUrl,
    ensureDir,
    writeSitemapFile,
    writeSitemapIndex,
    generateMainSitemapIndex as generateMainIndex,
    formatDate,
    getNextDay,
    getDayBounds,
} from "~/server/helpers/Sitemaps";

/**
 * Generate killmail sitemaps - organized by date with daily files
 */
async function generateKillmailSitemaps(): Promise<
    { filename: string; relativePath: string; lastmod?: string }[]
> {
    cliLogger.info("🔪 Starting killmail sitemap generation...");

    const categoryDir = join(SITEMAPS_DIR, "killmails");
    await ensureDir(categoryDir);

    const sitemapFiles: {
        filename: string;
        relativePath: string;
        lastmod?: string;
    }[] = [];

    // Get the earliest killmail to start from
    const earliestKillmail = await Killmails.findOne(
        {},
        { kill_time: 1 },
        { sort: { killmail_id: 1 } }
    ).lean();

    if (!earliestKillmail || !earliestKillmail.kill_time) {
        cliLogger.warn("⚠️ No killmails found with kill_time");
        return sitemapFiles;
    }

    const startDate = new Date(earliestKillmail.kill_time);
    const endDate = new Date(); // Today

    // Calculate total days to process
    const totalDays = Math.ceil(
        (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
    );

    cliLogger.info(
        `📅 Processing killmails from ${formatDate(startDate)} to ${formatDate(
            endDate
        )} (${totalDays} days total)`
    );

    let currentDate = new Date(startDate);
    let totalProcessed = 0;
    let dayCount = 0;

    while (currentDate <= endDate) {
        const { start, end } = getDayBounds(currentDate);
        const dateStr = formatDate(currentDate);
        dayCount++;
        const daysLeft = totalDays - dayCount;

        // Get killmails for this day
        const dayKillmails = await Killmails.find(
            {
                kill_time: {
                    $gte: start,
                    $lte: end,
                },
            },
            { killmail_id: 1, kill_time: 1 }
        )
            .sort({ kill_time: 1 })
            .lean();

        if (dayKillmails.length > 0) {
            cliLogger.info(
                `📆 Processing ${dayKillmails.length.toLocaleString()} killmails for ${dateStr} (${daysLeft} days left)`
            );

            // If day has more than max URLs, split into chunks
            if (dayKillmails.length > SITEMAP_MAX_URLS) {
                let chunkIndex = 0;
                for (
                    let i = 0;
                    i < dayKillmails.length;
                    i += SITEMAP_MAX_URLS
                ) {
                    const chunk = dayKillmails.slice(i, i + SITEMAP_MAX_URLS);
                    const urls: SitemapUrl[] = chunk.map((killmail) => ({
                        loc: `${SITE_URL}/kill/${killmail.killmail_id}`,
                        lastmod: formatDate(new Date(killmail.kill_time)),
                        changefreq: "never",
                        priority: 0.7,
                    }));

                    const filename = `${dateStr}-${chunkIndex
                        .toString()
                        .padStart(3, "0")}`;
                    const result = await writeSitemapFile(
                        "killmails",
                        urls,
                        filename,
                        cliLogger
                    );
                    sitemapFiles.push({
                        ...result,
                        lastmod: dateStr,
                    });
                    chunkIndex++;
                }
            } else {
                // Single file for the day
                const urls: SitemapUrl[] = dayKillmails.map((killmail) => ({
                    loc: `${SITE_URL}/kill/${killmail.killmail_id}`,
                    lastmod: formatDate(new Date(killmail.kill_time)),
                    changefreq: "never",
                    priority: 0.7,
                }));

                const result = await writeSitemapFile(
                    "killmails",
                    urls,
                    dateStr,
                    cliLogger
                );
                sitemapFiles.push({
                    ...result,
                    lastmod: dateStr,
                });
            }

            totalProcessed += dayKillmails.length;

            // Write/update index after each day to keep it current
            await writeSitemapIndex("killmails", sitemapFiles, cliLogger);
        }

        currentDate = getNextDay(currentDate);
    }

    cliLogger.info(
        `✅ Killmail sitemaps completed: ${
            sitemapFiles.length
        } files, ${totalProcessed.toLocaleString()} URLs`
    );
    return sitemapFiles;
}

/**
 * Generate battle sitemaps - organized by date
 */
async function generateBattleSitemaps(): Promise<
    { filename: string; relativePath: string; lastmod?: string }[]
> {
    cliLogger.info("⚔️ Starting battle sitemap generation...");

    const categoryDir = join(SITEMAPS_DIR, "battles");
    await ensureDir(categoryDir);

    const sitemapFiles: {
        filename: string;
        relativePath: string;
        lastmod?: string;
    }[] = [];

    // Get the earliest battle to start from
    const earliestBattle = await Battles.findOne({}, { createdAt: 1 })
        .sort({ createdAt: 1 })
        .lean();

    if (!earliestBattle || !earliestBattle.createdAt) {
        cliLogger.warn("⚠️ No battles found with createdAt");
        return sitemapFiles;
    }

    const startDate = new Date(earliestBattle.createdAt);
    const endDate = new Date(); // Today

    // Calculate total days to process
    const totalDays = Math.ceil(
        (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
    );

    cliLogger.info(
        `📅 Processing battles from ${formatDate(startDate)} to ${formatDate(
            endDate
        )} (${totalDays} days total)`
    );

    let currentDate = new Date(startDate);
    let totalProcessed = 0;
    let dayCount = 0;

    while (currentDate <= endDate) {
        const { start, end } = getDayBounds(currentDate);
        const dateStr = formatDate(currentDate);
        dayCount++;
        const daysLeft = totalDays - dayCount;

        // Get battles for this day
        const dayBattles = await Battles.find(
            {
                createdAt: {
                    $gte: start,
                    $lte: end,
                },
            },
            { battle_id: 1, end_time: 1, createdAt: 1 }
        )
            .sort({ createdAt: 1 })
            .lean();

        if (dayBattles.length > 0) {
            cliLogger.info(
                `📆 Processing ${dayBattles.length.toLocaleString()} battles for ${dateStr} (${daysLeft} days left)`
            );

            // If day has more than max URLs, split into chunks
            if (dayBattles.length > SITEMAP_MAX_URLS) {
                let chunkIndex = 0;
                for (let i = 0; i < dayBattles.length; i += SITEMAP_MAX_URLS) {
                    const chunk = dayBattles.slice(i, i + SITEMAP_MAX_URLS);
                    const urls: SitemapUrl[] = chunk.map((battle) => ({
                        loc: `${SITE_URL}/battle/${battle.battle_id}`,
                        lastmod: battle.end_time
                            ? formatDate(new Date(battle.end_time))
                            : formatDate(new Date(battle.createdAt)),
                        changefreq: "never",
                        priority: 0.8,
                    }));

                    const filename = `${dateStr}-${chunkIndex
                        .toString()
                        .padStart(3, "0")}`;
                    const result = await writeSitemapFile(
                        "battles",
                        urls,
                        filename,
                        cliLogger
                    );
                    sitemapFiles.push({
                        ...result,
                        lastmod: dateStr,
                    });
                    chunkIndex++;
                }
            } else {
                // Single file for the day
                const urls: SitemapUrl[] = dayBattles.map((battle) => ({
                    loc: `${SITE_URL}/battle/${battle.battle_id}`,
                    lastmod: battle.end_time
                        ? formatDate(new Date(battle.end_time))
                        : formatDate(new Date(battle.createdAt)),
                    changefreq: "never",
                    priority: 0.8,
                }));

                const result = await writeSitemapFile(
                    "battles",
                    urls,
                    dateStr,
                    cliLogger
                );
                sitemapFiles.push({
                    ...result,
                    lastmod: dateStr,
                });
            }

            totalProcessed += dayBattles.length;

            // Write/update index after each day to keep it current
            await writeSitemapIndex("battles", sitemapFiles, cliLogger);
        }

        currentDate = getNextDay(currentDate);
    }

    cliLogger.info(
        `✅ Battle sitemaps completed: ${
            sitemapFiles.length
        } files, ${totalProcessed.toLocaleString()} URLs`
    );
    return sitemapFiles;
}

/**
 * Generate campaign sitemaps - organized by date
 */
async function generateCampaignSitemaps(): Promise<
    { filename: string; relativePath: string; lastmod?: string }[]
> {
    cliLogger.info("🎯 Starting campaign sitemap generation...");

    const categoryDir = join(SITEMAPS_DIR, "campaigns");
    await ensureDir(categoryDir);

    const sitemapFiles: {
        filename: string;
        relativePath: string;
        lastmod?: string;
    }[] = [];

    // Get the earliest campaign to start from
    const earliestCampaign = await Campaigns.findOne(
        { public: true },
        { createdAt: 1 }
    )
        .sort({ createdAt: 1 })
        .lean();

    if (!earliestCampaign || !earliestCampaign.createdAt) {
        cliLogger.warn("⚠️ No public campaigns found with createdAt");
        return sitemapFiles;
    }

    const startDate = new Date(earliestCampaign.createdAt);
    const endDate = new Date(); // Today

    // Calculate total days to process
    const totalDays = Math.ceil(
        (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
    );

    cliLogger.info(
        `📅 Processing campaigns from ${formatDate(startDate)} to ${formatDate(
            endDate
        )} (${totalDays} days total)`
    );

    let currentDate = new Date(startDate);
    let totalProcessed = 0;
    let dayCount = 0;

    while (currentDate <= endDate) {
        const { start, end } = getDayBounds(currentDate);
        const dateStr = formatDate(currentDate);
        dayCount++;
        const daysLeft = totalDays - dayCount;

        // Get campaigns for this day
        const dayCampaigns = await Campaigns.find(
            {
                public: true,
                createdAt: {
                    $gte: start,
                    $lte: end,
                },
            },
            {
                campaign_id: 1,
                processing_completed_at: 1,
                last_processed_at: 1,
                createdAt: 1,
            }
        )
            .sort({ createdAt: 1 })
            .lean();

        if (dayCampaigns.length > 0) {
            cliLogger.info(
                `📆 Processing ${dayCampaigns.length.toLocaleString()} campaigns for ${dateStr} (${daysLeft} days left)`
            );

            // Single file for the day (campaigns are usually much fewer)
            const urls: SitemapUrl[] = dayCampaigns.map((campaign) => ({
                loc: `${SITE_URL}/campaigns/${campaign.campaign_id}`,
                lastmod: campaign.processing_completed_at
                    ? formatDate(new Date(campaign.processing_completed_at))
                    : campaign.last_processed_at
                    ? formatDate(new Date(campaign.last_processed_at))
                    : formatDate(new Date(campaign.createdAt)),
                changefreq: "weekly",
                priority: 0.6,
            }));

            const result = await writeSitemapFile(
                "campaigns",
                urls,
                dateStr,
                cliLogger
            );
            sitemapFiles.push({
                ...result,
                lastmod: dateStr,
            });

            totalProcessed += dayCampaigns.length;

            // Write/update index after each day to keep it current
            await writeSitemapIndex("campaigns", sitemapFiles, cliLogger);
        }

        currentDate = getNextDay(currentDate);
    }

    cliLogger.info(
        `✅ Campaign sitemaps completed: ${
            sitemapFiles.length
        } files, ${totalProcessed.toLocaleString()} URLs`
    );
    return sitemapFiles;
}

/**
 * Generate character sitemaps - organized by date
 */
async function generateCharacterSitemaps(): Promise<
    { filename: string; relativePath: string; lastmod?: string }[]
> {
    cliLogger.info("👤 Starting character sitemap generation...");

    const categoryDir = join(SITEMAPS_DIR, "characters");
    await ensureDir(categoryDir);

    const sitemapFiles: {
        filename: string;
        relativePath: string;
        lastmod?: string;
    }[] = [];

    // Get the earliest character to start from
    const earliestCharacter = await Characters.findOne({}, { createdAt: 1 })
        .sort({ createdAt: 1 })
        .lean();

    if (!earliestCharacter || !earliestCharacter.createdAt) {
        cliLogger.warn("⚠️ No characters found with createdAt");
        return sitemapFiles;
    }

    const startDate = new Date(earliestCharacter.createdAt);
    const endDate = new Date(); // Today

    // Calculate total days to process
    const totalDays = Math.ceil(
        (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
    );

    cliLogger.info(
        `📅 Processing characters from ${formatDate(startDate)} to ${formatDate(
            endDate
        )} (${totalDays} days total)`
    );

    let currentDate = new Date(startDate);
    let totalProcessed = 0;
    let dayCount = 0;

    while (currentDate <= endDate) {
        const { start, end } = getDayBounds(currentDate);
        const dateStr = formatDate(currentDate);
        dayCount++;
        const daysLeft = totalDays - dayCount;

        // Get characters for this day
        const dayCharacters = await Characters.find(
            {
                createdAt: {
                    $gte: start,
                    $lte: end,
                },
            },
            { character_id: 1, updatedAt: 1, createdAt: 1 }
        )
            .sort({ createdAt: 1 })
            .lean();

        if (dayCharacters.length > 0) {
            cliLogger.info(
                `📆 Processing ${dayCharacters.length.toLocaleString()} characters for ${dateStr} (${daysLeft} days left)`
            );

            // If day has more than max URLs, split into chunks
            if (dayCharacters.length > SITEMAP_MAX_URLS) {
                let chunkIndex = 0;
                for (
                    let i = 0;
                    i < dayCharacters.length;
                    i += SITEMAP_MAX_URLS
                ) {
                    const chunk = dayCharacters.slice(i, i + SITEMAP_MAX_URLS);
                    const urls: SitemapUrl[] = chunk.map((character) => ({
                        loc: `${SITE_URL}/character/${character.character_id}`,
                        lastmod: character.updatedAt
                            ? formatDate(new Date(character.updatedAt))
                            : formatDate(new Date(character.createdAt)),
                        changefreq: "monthly",
                        priority: 0.5,
                    }));

                    const filename = `${dateStr}-${chunkIndex
                        .toString()
                        .padStart(3, "0")}`;
                    const result = await writeSitemapFile(
                        "characters",
                        urls,
                        filename,
                        cliLogger
                    );
                    sitemapFiles.push({
                        ...result,
                        lastmod: dateStr,
                    });
                    chunkIndex++;
                }
            } else {
                // Single file for the day
                const urls: SitemapUrl[] = dayCharacters.map((character) => ({
                    loc: `${SITE_URL}/character/${character.character_id}`,
                    lastmod: character.updatedAt
                        ? formatDate(new Date(character.updatedAt))
                        : formatDate(new Date(character.createdAt)),
                    changefreq: "monthly",
                    priority: 0.5,
                }));

                const result = await writeSitemapFile(
                    "characters",
                    urls,
                    dateStr,
                    cliLogger
                );
                sitemapFiles.push({
                    ...result,
                    lastmod: dateStr,
                });
            }

            totalProcessed += dayCharacters.length;

            // Write/update index after each day to keep it current
            await writeSitemapIndex("characters", sitemapFiles, cliLogger);
        }

        currentDate = getNextDay(currentDate);
    }

    cliLogger.info(
        `✅ Character sitemaps completed: ${
            sitemapFiles.length
        } files, ${totalProcessed.toLocaleString()} URLs`
    );
    return sitemapFiles;
}

/**
 * Generate corporation sitemaps - organized by date
 */
async function generateCorporationSitemaps(): Promise<
    { filename: string; relativePath: string; lastmod?: string }[]
> {
    cliLogger.info("🏢 Starting corporation sitemap generation...");

    const categoryDir = join(SITEMAPS_DIR, "corporations");
    await ensureDir(categoryDir);

    const sitemapFiles: {
        filename: string;
        relativePath: string;
        lastmod?: string;
    }[] = [];

    // Get the earliest corporation to start from
    const earliestCorporation = await Corporations.findOne({}, { createdAt: 1 })
        .sort({ createdAt: 1 })
        .lean();

    if (!earliestCorporation || !earliestCorporation.createdAt) {
        cliLogger.warn("⚠️ No corporations found with createdAt");
        return sitemapFiles;
    }

    const startDate = new Date(earliestCorporation.createdAt);
    const endDate = new Date(); // Today

    // Calculate total days to process
    const totalDays = Math.ceil(
        (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
    );

    cliLogger.info(
        `📅 Processing corporations from ${formatDate(
            startDate
        )} to ${formatDate(endDate)} (${totalDays} days total)`
    );

    let currentDate = new Date(startDate);
    let totalProcessed = 0;
    let dayCount = 0;

    while (currentDate <= endDate) {
        const { start, end } = getDayBounds(currentDate);
        const dateStr = formatDate(currentDate);
        dayCount++;
        const daysLeft = totalDays - dayCount;

        // Get corporations for this day
        const dayCorporations = await Corporations.find(
            {
                createdAt: {
                    $gte: start,
                    $lte: end,
                },
            },
            { corporation_id: 1, updatedAt: 1, createdAt: 1 }
        )
            .sort({ createdAt: 1 })
            .lean();

        if (dayCorporations.length > 0) {
            cliLogger.info(
                `📆 Processing ${dayCorporations.length.toLocaleString()} corporations for ${dateStr} (${daysLeft} days left)`
            );

            // If day has more than max URLs, split into chunks
            if (dayCorporations.length > SITEMAP_MAX_URLS) {
                let chunkIndex = 0;
                for (
                    let i = 0;
                    i < dayCorporations.length;
                    i += SITEMAP_MAX_URLS
                ) {
                    const chunk = dayCorporations.slice(
                        i,
                        i + SITEMAP_MAX_URLS
                    );
                    const urls: SitemapUrl[] = chunk.map((corporation) => ({
                        loc: `${SITE_URL}/corporation/${corporation.corporation_id}`,
                        lastmod: corporation.updatedAt
                            ? formatDate(new Date(corporation.updatedAt))
                            : formatDate(new Date(corporation.createdAt)),
                        changefreq: "monthly",
                        priority: 0.5,
                    }));

                    const filename = `${dateStr}-${chunkIndex
                        .toString()
                        .padStart(3, "0")}`;
                    const result = await writeSitemapFile(
                        "corporations",
                        urls,
                        filename,
                        cliLogger
                    );
                    sitemapFiles.push({
                        ...result,
                        lastmod: dateStr,
                    });
                    chunkIndex++;
                }
            } else {
                // Single file for the day
                const urls: SitemapUrl[] = dayCorporations.map(
                    (corporation) => ({
                        loc: `${SITE_URL}/corporation/${corporation.corporation_id}`,
                        lastmod: corporation.updatedAt
                            ? formatDate(new Date(corporation.updatedAt))
                            : formatDate(new Date(corporation.createdAt)),
                        changefreq: "monthly",
                        priority: 0.5,
                    })
                );

                const result = await writeSitemapFile(
                    "corporations",
                    urls,
                    dateStr,
                    cliLogger
                );
                sitemapFiles.push({
                    ...result,
                    lastmod: dateStr,
                });
            }

            totalProcessed += dayCorporations.length;

            // Write/update index after each day to keep it current
            await writeSitemapIndex("corporations", sitemapFiles, cliLogger);
        }

        currentDate = getNextDay(currentDate);
    }

    cliLogger.info(
        `✅ Corporation sitemaps completed: ${
            sitemapFiles.length
        } files, ${totalProcessed.toLocaleString()} URLs`
    );
    return sitemapFiles;
}

/**
 * Generate alliance sitemaps - organized by date
 */
async function generateAllianceSitemaps(): Promise<
    { filename: string; relativePath: string; lastmod?: string }[]
> {
    cliLogger.info("🤝 Starting alliance sitemap generation...");

    const categoryDir = join(SITEMAPS_DIR, "alliances");
    await ensureDir(categoryDir);

    const sitemapFiles: {
        filename: string;
        relativePath: string;
        lastmod?: string;
    }[] = [];

    // Get the earliest alliance to start from
    const earliestAlliance = await Alliances.findOne({}, { createdAt: 1 })
        .sort({ createdAt: 1 })
        .lean();

    if (!earliestAlliance || !earliestAlliance.createdAt) {
        cliLogger.warn("⚠️ No alliances found with createdAt");
        return sitemapFiles;
    }

    const startDate = new Date(earliestAlliance.createdAt);
    const endDate = new Date(); // Today

    // Calculate total days to process
    const totalDays = Math.ceil(
        (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
    );

    cliLogger.info(
        `📅 Processing alliances from ${formatDate(startDate)} to ${formatDate(
            endDate
        )} (${totalDays} days total)`
    );

    let currentDate = new Date(startDate);
    let totalProcessed = 0;
    let dayCount = 0;

    while (currentDate <= endDate) {
        const { start, end } = getDayBounds(currentDate);
        const dateStr = formatDate(currentDate);
        dayCount++;
        const daysLeft = totalDays - dayCount;

        // Get alliances for this day
        const dayAlliances = await Alliances.find(
            {
                createdAt: {
                    $gte: start,
                    $lte: end,
                },
            },
            { alliance_id: 1, updatedAt: 1, createdAt: 1 }
        )
            .sort({ createdAt: 1 })
            .lean();

        if (dayAlliances.length > 0) {
            cliLogger.info(
                `📆 Processing ${dayAlliances.length.toLocaleString()} alliances for ${dateStr} (${daysLeft} days left)`
            );

            // Single file for the day (alliances are usually much fewer)
            const urls: SitemapUrl[] = dayAlliances.map((alliance) => ({
                loc: `${SITE_URL}/alliance/${alliance.alliance_id}`,
                lastmod: alliance.updatedAt
                    ? formatDate(new Date(alliance.updatedAt))
                    : formatDate(new Date(alliance.createdAt)),
                changefreq: "monthly",
                priority: 0.6,
            }));

            const result = await writeSitemapFile(
                "alliances",
                urls,
                dateStr,
                cliLogger
            );
            sitemapFiles.push({
                ...result,
                lastmod: dateStr,
            });

            totalProcessed += dayAlliances.length;

            // Write/update index after each day to keep it current
            await writeSitemapIndex("alliances", sitemapFiles, cliLogger);
        }

        currentDate = getNextDay(currentDate);
    }

    cliLogger.info(
        `✅ Alliance sitemaps completed: ${
            sitemapFiles.length
        } files, ${totalProcessed.toLocaleString()} URLs`
    );
    return sitemapFiles;
}

/**
 * Generate main sitemap index
 */
async function generateMainSitemapIndex(): Promise<void> {
    const categories = [
        "killmails",
        "battles",
        "campaigns",
        "characters",
        "corporations",
        "alliances",
    ];

    await generateMainIndex(categories, cliLogger);
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
            await writeSitemapIndex("killmails", killmailFiles, cliLogger);

            const battleFiles = await generateBattleSitemaps();
            await writeSitemapIndex("battles", battleFiles, cliLogger);

            const campaignFiles = await generateCampaignSitemaps();
            await writeSitemapIndex("campaigns", campaignFiles, cliLogger);

            const characterFiles = await generateCharacterSitemaps();
            await writeSitemapIndex("characters", characterFiles, cliLogger);

            const corporationFiles = await generateCorporationSitemaps();
            await writeSitemapIndex(
                "corporations",
                corporationFiles,
                cliLogger
            );

            const allianceFiles = await generateAllianceSitemaps();
            await writeSitemapIndex("alliances", allianceFiles, cliLogger);

            // Generate main index
            await generateMainSitemapIndex();

            const endTime = Date.now();
            const duration = (endTime - startTime) / 1000 / 60; // minutes

            cliLogger.info("🎉 Sitemap generation completed successfully!");
            cliLogger.info(
                `⏱️ Total time taken: ${duration.toFixed(2)} minutes`
            );
            cliLogger.info(`📁 Sitemaps have been written to: ${SITEMAPS_DIR}`);
            cliLogger.info(
                "💡 Don't forget to update robots.txt to reference the new sitemaps!"
            );
        } catch (error) {
            cliLogger.error(`💥 Error during sitemap generation: ${error}`);
            throw error;
        }
    },
};
