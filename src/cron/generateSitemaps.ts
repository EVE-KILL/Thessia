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
    writeSitemapIndexFromDisk,
    formatDate,
    getNextDay,
    getDayBounds,
} from "~/server/helpers/Sitemaps";

/**
 * Generate killmail sitemaps for the last 7 days
 */
async function updateKillmailSitemaps(): Promise<{
    processed: number;
    filesUpdated: number;
}> {
    cliLogger.info("🔪 Updating killmail sitemaps for last 7 days...");

    const categoryDir = join(SITEMAPS_DIR, "killmails");
    await ensureDir(categoryDir);

    let totalProcessed = 0;
    let filesUpdated = 0;

    // Process last 7 days
    const endDate = new Date();
    const startDate = new Date(endDate);
    startDate.setDate(startDate.getDate() - 7);

    cliLogger.info(
        `📅 Processing killmails from ${formatDate(startDate)} to ${formatDate(
            endDate
        )} (last 7 days)`
    );

    let currentDate = new Date(startDate);

    while (currentDate <= endDate) {
        const { start, end } = getDayBounds(currentDate);
        const dateStr = formatDate(currentDate);

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
                `📆 Processing ${dayKillmails.length.toLocaleString()} killmails for ${dateStr}`
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
                    await writeSitemapFile(
                        "killmails",
                        urls,
                        filename,
                        cliLogger
                    );
                    chunkIndex++;
                    filesUpdated++;
                }
            } else {
                // Single file for the day
                const urls: SitemapUrl[] = dayKillmails.map((killmail) => ({
                    loc: `${SITE_URL}/kill/${killmail.killmail_id}`,
                    lastmod: formatDate(new Date(killmail.kill_time)),
                    changefreq: "never",
                    priority: 0.7,
                }));

                await writeSitemapFile("killmails", urls, dateStr, cliLogger);
                filesUpdated++;
            }

            totalProcessed += dayKillmails.length;
        }

        currentDate = getNextDay(currentDate);
    }

    cliLogger.info(
        `✅ Killmail sitemaps updated: ${filesUpdated} files, ${totalProcessed.toLocaleString()} URLs`
    );
    return { processed: totalProcessed, filesUpdated };
}

/**
 * Generate battle sitemaps for the last 7 days
 */
async function updateBattleSitemaps(): Promise<{
    processed: number;
    filesUpdated: number;
}> {
    cliLogger.info("⚔️ Updating battle sitemaps for last 7 days...");

    const categoryDir = join(SITEMAPS_DIR, "battles");
    await ensureDir(categoryDir);

    let totalProcessed = 0;
    let filesUpdated = 0;

    // Process last 7 days
    const endDate = new Date();
    const startDate = new Date(endDate);
    startDate.setDate(startDate.getDate() - 7);

    cliLogger.info(
        `📅 Processing battles from ${formatDate(startDate)} to ${formatDate(
            endDate
        )} (last 7 days)`
    );

    let currentDate = new Date(startDate);

    while (currentDate <= endDate) {
        const { start, end } = getDayBounds(currentDate);
        const dateStr = formatDate(currentDate);

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
                `📆 Processing ${dayBattles.length.toLocaleString()} battles for ${dateStr}`
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
                    await writeSitemapFile(
                        "battles",
                        urls,
                        filename,
                        cliLogger
                    );
                    chunkIndex++;
                    filesUpdated++;
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

                await writeSitemapFile("battles", urls, dateStr, cliLogger);
                filesUpdated++;
            }

            totalProcessed += dayBattles.length;
        }

        currentDate = getNextDay(currentDate);
    }

    cliLogger.info(
        `✅ Battle sitemaps updated: ${filesUpdated} files, ${totalProcessed.toLocaleString()} URLs`
    );
    return { processed: totalProcessed, filesUpdated };
}

/**
 * Generate campaign sitemaps for the last 7 days
 */
async function updateCampaignSitemaps(): Promise<{
    processed: number;
    filesUpdated: number;
}> {
    cliLogger.info("🎯 Updating campaign sitemaps for last 7 days...");

    const categoryDir = join(SITEMAPS_DIR, "campaigns");
    await ensureDir(categoryDir);

    let totalProcessed = 0;
    let filesUpdated = 0;

    // Process last 7 days
    const endDate = new Date();
    const startDate = new Date(endDate);
    startDate.setDate(startDate.getDate() - 7);

    cliLogger.info(
        `📅 Processing campaigns from ${formatDate(startDate)} to ${formatDate(
            endDate
        )} (last 7 days)`
    );

    let currentDate = new Date(startDate);

    while (currentDate <= endDate) {
        const { start, end } = getDayBounds(currentDate);
        const dateStr = formatDate(currentDate);

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
                `📆 Processing ${dayCampaigns.length.toLocaleString()} campaigns for ${dateStr}`
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

            await writeSitemapFile("campaigns", urls, dateStr, cliLogger);
            filesUpdated++;
            totalProcessed += dayCampaigns.length;
        }

        currentDate = getNextDay(currentDate);
    }

    cliLogger.info(
        `✅ Campaign sitemaps updated: ${filesUpdated} files, ${totalProcessed.toLocaleString()} URLs`
    );
    return { processed: totalProcessed, filesUpdated };
}

/**
 * Generate character sitemaps for the last 7 days
 */
async function updateCharacterSitemaps(): Promise<{
    processed: number;
    filesUpdated: number;
}> {
    cliLogger.info("👤 Updating character sitemaps for last 7 days...");

    const categoryDir = join(SITEMAPS_DIR, "characters");
    await ensureDir(categoryDir);

    let totalProcessed = 0;
    let filesUpdated = 0;

    // Process last 7 days
    const endDate = new Date();
    const startDate = new Date(endDate);
    startDate.setDate(startDate.getDate() - 7);

    cliLogger.info(
        `📅 Processing characters from ${formatDate(startDate)} to ${formatDate(
            endDate
        )} (last 7 days)`
    );

    let currentDate = new Date(startDate);

    while (currentDate <= endDate) {
        const { start, end } = getDayBounds(currentDate);
        const dateStr = formatDate(currentDate);

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
                `📆 Processing ${dayCharacters.length.toLocaleString()} characters for ${dateStr}`
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
                    await writeSitemapFile(
                        "characters",
                        urls,
                        filename,
                        cliLogger
                    );
                    chunkIndex++;
                    filesUpdated++;
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

                await writeSitemapFile("characters", urls, dateStr, cliLogger);
                filesUpdated++;
            }

            totalProcessed += dayCharacters.length;
        }

        currentDate = getNextDay(currentDate);
    }

    cliLogger.info(
        `✅ Character sitemaps updated: ${filesUpdated} files, ${totalProcessed.toLocaleString()} URLs`
    );
    return { processed: totalProcessed, filesUpdated };
}

/**
 * Generate corporation sitemaps for the last 7 days
 */
async function updateCorporationSitemaps(): Promise<{
    processed: number;
    filesUpdated: number;
}> {
    cliLogger.info("🏢 Updating corporation sitemaps for last 7 days...");

    const categoryDir = join(SITEMAPS_DIR, "corporations");
    await ensureDir(categoryDir);

    let totalProcessed = 0;
    let filesUpdated = 0;

    // Process last 7 days
    const endDate = new Date();
    const startDate = new Date(endDate);
    startDate.setDate(startDate.getDate() - 7);

    cliLogger.info(
        `📅 Processing corporations from ${formatDate(
            startDate
        )} to ${formatDate(endDate)} (last 7 days)`
    );

    let currentDate = new Date(startDate);

    while (currentDate <= endDate) {
        const { start, end } = getDayBounds(currentDate);
        const dateStr = formatDate(currentDate);

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
                `📆 Processing ${dayCorporations.length.toLocaleString()} corporations for ${dateStr}`
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
                    await writeSitemapFile(
                        "corporations",
                        urls,
                        filename,
                        cliLogger
                    );
                    chunkIndex++;
                    filesUpdated++;
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

                await writeSitemapFile(
                    "corporations",
                    urls,
                    dateStr,
                    cliLogger
                );
                filesUpdated++;
            }

            totalProcessed += dayCorporations.length;
        }

        currentDate = getNextDay(currentDate);
    }

    cliLogger.info(
        `✅ Corporation sitemaps updated: ${filesUpdated} files, ${totalProcessed.toLocaleString()} URLs`
    );
    return { processed: totalProcessed, filesUpdated };
}

/**
 * Generate alliance sitemaps for the last 7 days
 */
async function updateAllianceSitemaps(): Promise<{
    processed: number;
    filesUpdated: number;
}> {
    cliLogger.info("🤝 Updating alliance sitemaps for last 7 days...");

    const categoryDir = join(SITEMAPS_DIR, "alliances");
    await ensureDir(categoryDir);

    let totalProcessed = 0;
    let filesUpdated = 0;

    // Process last 7 days
    const endDate = new Date();
    const startDate = new Date(endDate);
    startDate.setDate(startDate.getDate() - 7);

    cliLogger.info(
        `📅 Processing alliances from ${formatDate(startDate)} to ${formatDate(
            endDate
        )} (last 7 days)`
    );

    let currentDate = new Date(startDate);

    while (currentDate <= endDate) {
        const { start, end } = getDayBounds(currentDate);
        const dateStr = formatDate(currentDate);

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
                `📆 Processing ${dayAlliances.length.toLocaleString()} alliances for ${dateStr}`
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

            await writeSitemapFile("alliances", urls, dateStr, cliLogger);
            filesUpdated++;
            totalProcessed += dayAlliances.length;
        }

        currentDate = getNextDay(currentDate);
    }

    cliLogger.info(
        `✅ Alliance sitemaps updated: ${filesUpdated} files, ${totalProcessed.toLocaleString()} URLs`
    );
    return { processed: totalProcessed, filesUpdated };
}

export default {
    name: "generateSitemaps",
    description:
        "Generates sitemap data for the past 7 days (incremental update)",
    schedule: "0 2 * * *", // Run at 2 AM daily
    run: async () => {
        const startTime = Date.now();
        cliLogger.info(
            "🗺️ Starting incremental sitemap generation (last 7 days)..."
        );

        try {
            // Ensure main sitemaps directory exists
            await ensureDir(SITEMAPS_DIR);

            // Update sitemaps for each category
            const killmailResults = await updateKillmailSitemaps();
            const battleResults = await updateBattleSitemaps();
            const campaignResults = await updateCampaignSitemaps();
            const characterResults = await updateCharacterSitemaps();
            const corporationResults = await updateCorporationSitemaps();
            const allianceResults = await updateAllianceSitemaps();

            // Update indexes from disk (to include all existing files)
            cliLogger.info("📝 Updating sitemap indexes...");
            await writeSitemapIndexFromDisk("killmails", cliLogger);
            await writeSitemapIndexFromDisk("battles", cliLogger);
            await writeSitemapIndexFromDisk("campaigns", cliLogger);
            await writeSitemapIndexFromDisk("characters", cliLogger);
            await writeSitemapIndexFromDisk("corporations", cliLogger);
            await writeSitemapIndexFromDisk("alliances", cliLogger);

            const endTime = Date.now();
            const duration = (endTime - startTime) / 1000 / 60; // minutes

            const totalFiles =
                killmailResults.filesUpdated +
                battleResults.filesUpdated +
                campaignResults.filesUpdated +
                characterResults.filesUpdated +
                corporationResults.filesUpdated +
                allianceResults.filesUpdated;

            const totalURLs =
                killmailResults.processed +
                battleResults.processed +
                campaignResults.processed +
                characterResults.processed +
                corporationResults.processed +
                allianceResults.processed;

            cliLogger.info("🎉 Incremental sitemap generation completed!");
            cliLogger.info(`📊 Summary:`);
            cliLogger.info(
                `   - Files Updated: ${totalFiles.toLocaleString()}`
            );
            cliLogger.info(
                `   - URLs Processed: ${totalURLs.toLocaleString()}`
            );
            cliLogger.info(`⏱️ Time taken: ${duration.toFixed(2)} minutes`);
            cliLogger.info(`📁 Sitemaps location: ${SITEMAPS_DIR}`);
        } catch (error) {
            cliLogger.error(
                `💥 Error during incremental sitemap generation: ${error}`
            );
            throw error;
        }
    },
};
