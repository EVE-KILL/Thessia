import { MetricsTime } from "bullmq";
import os from "node:os";
import { cliLogger } from "~/server/helpers/Logger";
import { createQueue } from "~/server/helpers/Queue";
import {
    CACHE_NAMESPACES,
    getCacheHitCount,
    getCacheSize,
} from "~/server/helpers/RuntimeCache";
import { RedisStorage } from "~/server/helpers/Storage";
import { numberFormat } from "~/src/core/utils/numberFormat";

const startTime = new Date();

/**
 * Helper function to get queue processing metrics for different time periods
 */
async function getQueueProcessingMetrics(
    queue: any,
    timeframe: MetricsTime
): Promise<string> {
    try {
        const metrics = await queue.getMetrics("completed", 0, timeframe);
        const total = metrics.data.reduce(
            (acc: number, cur: any) => acc + Number(cur),
            0
        );
        return numberFormat(total);
    } catch (error) {
        console.error(`Error getting queue metrics: ${error}`);
        return "0";
    }
}

/**
 * Helper function to get single minute processing count
 */
async function getSingleMinuteProcessingCount(queue: any): Promise<string> {
    try {
        const metrics = await queue.getMetrics(
            "completed",
            0,
            MetricsTime.ONE_MINUTE
        );
        return numberFormat(Number(metrics.data[0]) || 0);
    } catch (error) {
        console.error(`Error getting single minute metrics: ${error}`);
        return "0";
    }
}

export default defineEventHandler(async () => {
    const allianceQueue = createQueue("alliance");
    const corporationQueue = createQueue("corporation");
    const characterQueue = createQueue("character");
    const characterHistoryQueue = createQueue("characterhistory");
    const corporationHistoryQueue = createQueue("corporationhistory");
    const killmailQueue = createQueue("killmail");
    const warQueue = createQueue("war");
    const statsQueue = createQueue("stats");
    const achievementQueue = createQueue("achievement");
    const campaignQueue = createQueue("campaign");
    const historicalStatsQueue = createQueue("historicalStats");

    const [
        allianceQueueCount,
        corporationQueueCount,
        characterQueueCount,
        characterHistoryQueueCount,
        corporationHistoryQueueCount,
        killmailQueueCount,
        warQueueCount,
        statsQueueCount,
        achievementQueueCount,
        campaignQueueCount,
        historicalStatsQueueCount,
        allianceCount,
        celestialCount,
        characterCount,
        corporationCount,
        commentCount,
        constellationCount,
        customPriceCount,
        factionCount,
        invFlagCount,
        invGroupCount,
        invTypeCount,
        killmailCount,
        esiKillmailCount,
        esiUnprocessedCount,
        priceCount,
        regionCount,
        solarSystemsCount,
        userCount,
        warCount,
        raceCount,
        localScanCount,
        campaignCount,
        dScanCount,
        statsCount,
        savedQueryCount,
        bloodlineCount,
        battleCount,
        characterAchievementCount,
        historicalStatsCount,
        configCount,
    ] = await Promise.all([
        allianceQueue.count(),
        corporationQueue.count(),
        characterQueue.count(),
        characterHistoryQueue.count(),
        corporationHistoryQueue.count(),
        killmailQueue.count(),
        warQueue.count(),
        statsQueue.count(),
        achievementQueue.count(),
        campaignQueue.count(),
        historicalStatsQueue.count(),
        Alliances.estimatedDocumentCount(),
        Celestials.estimatedDocumentCount(),
        Characters.estimatedDocumentCount(),
        Corporations.estimatedDocumentCount(),
        Comments.estimatedDocumentCount(),
        Constellations.estimatedDocumentCount(),
        CustomPrices.estimatedDocumentCount(),
        Factions.estimatedDocumentCount(),
        InvFlags.estimatedDocumentCount(),
        InvGroups.estimatedDocumentCount(),
        InvTypes.estimatedDocumentCount(),
        Killmails.estimatedDocumentCount(),
        KillmailsESI.estimatedDocumentCount(),
        KillmailsESI.countDocuments({ processed: false }),
        Prices.estimatedDocumentCount(),
        Regions.estimatedDocumentCount(),
        SolarSystems.estimatedDocumentCount(),
        Users.estimatedDocumentCount(),
        Wars.estimatedDocumentCount(),
        Races.estimatedDocumentCount(),
        LocalScan.estimatedDocumentCount(),
        Campaigns.estimatedDocumentCount(),
        DScan.estimatedDocumentCount(),
        Stats.estimatedDocumentCount(),
        SavedQuery.estimatedDocumentCount(),
        Bloodlines.estimatedDocumentCount(),
        Battles.estimatedDocumentCount(),
        CharacterAchievements.estimatedDocumentCount(),
        HistoricalStats.estimatedDocumentCount(),
        Config.estimatedDocumentCount(),
    ]);

    // Get IPX cache count from Redis
    let ipxCacheCount = 0;
    try {
        const redisStorage = RedisStorage.getInstance();
        // Count keys with the 'ipx:image:' prefix
        ipxCacheCount = await redisStorage.client
            .keys("ipx:image:*")
            .then((keys: string[]) => keys.length);
    } catch (err) {
        console.error("Failed to get IPX cache stats:", err);
    }

    // Get cache sizes and hits directly from Redis
    const cacheStats = await Promise.all([
        // Cache sizes
        getCacheSize(CACHE_NAMESPACES.SOLAR_SYSTEMS),
        getCacheSize(CACHE_NAMESPACES.REGIONS),
        getCacheSize(CACHE_NAMESPACES.CONSTELLATIONS),
        getCacheSize(CACHE_NAMESPACES.CUSTOM_PRICES),
        getCacheSize(CACHE_NAMESPACES.INV_GROUPS),
        getCacheSize(CACHE_NAMESPACES.INV_FLAGS),
        getCacheSize(CACHE_NAMESPACES.INV_TYPES),
        getCacheSize(CACHE_NAMESPACES.FACTIONS),
        getCacheSize(CACHE_NAMESPACES.PRICE),
        getCacheSize(CACHE_NAMESPACES.CHARACTER),
        getCacheSize(CACHE_NAMESPACES.CORPORATION),
        getCacheSize(CACHE_NAMESPACES.ALLIANCE),
        // Hit counters
        getCacheHitCount(CACHE_NAMESPACES.INV_GROUPS),
        getCacheHitCount(CACHE_NAMESPACES.INV_TYPES),
        getCacheHitCount(CACHE_NAMESPACES.INV_FLAGS),
        getCacheHitCount(CACHE_NAMESPACES.FACTIONS),
        getCacheHitCount(CACHE_NAMESPACES.REGIONS),
        getCacheHitCount(CACHE_NAMESPACES.CONSTELLATIONS),
        getCacheHitCount(CACHE_NAMESPACES.SOLAR_SYSTEMS),
        getCacheHitCount(CACHE_NAMESPACES.PRICE),
        getCacheHitCount(CACHE_NAMESPACES.CHARACTER),
        getCacheHitCount(CACHE_NAMESPACES.CORPORATION),
        getCacheHitCount(CACHE_NAMESPACES.ALLIANCE),
    ]);

    // Format cache hits
    const formattedCacheHits = {
        invGroups: cacheStats[12],
        invTypes: cacheStats[13],
        invFlags: cacheStats[14],
        factions: cacheStats[15],
        regions: cacheStats[16],
        constellations: cacheStats[17],
        solarSystems: cacheStats[18],
        price: cacheStats[19],
        character: cacheStats[20],
        corporation: cacheStats[21],
        alliance: cacheStats[22],
    };

    // Get WebSocket stats
    let websocketStats = {};
    try {
        const {
            getKillmailClientCount,
            getCommentClientCount,
            getSubscriptionStatus,
            getConnectionHealth,
        } = await import("~/server/helpers/WSClientManager");

        websocketStats = {
            killmail: {
                clients: getKillmailClientCount(),
                health: getConnectionHealth("killmail"),
            },
            comment: {
                clients: getCommentClientCount(),
                health: getConnectionHealth("comment"),
            },
            subscriptions: getSubscriptionStatus(),
        };
    } catch (err) {
        console.error("Failed to get WebSocket stats:", err);
        websocketStats = {
            killmail: {
                clients: 0,
                health: {
                    alive_clients: 0,
                    total_clients: 0,
                    last_ping_sent: null,
                    oldest_client: null,
                },
            },
            comment: {
                clients: 0,
                health: {
                    alive_clients: 0,
                    total_clients: 0,
                    last_ping_sent: null,
                    oldest_client: null,
                },
            },
            subscriptions: { killmail: false, comment: false },
        };
    }

    // Get Redis stats
    let redisStats = {};
    try {
        const redisStorage = RedisStorage.getInstance();
        const fullRedisStats = await redisStorage.getRedisStats();
        const [redisHealth, connectionDetails] = await Promise.all([
            redisStorage.healthCheck(),
            redisStorage.getConnectionDetails(),
        ]);

        // Extract only the Redis stats we need for the UI
        redisStats = {
            server: {
                redis_version: fullRedisStats.server?.redis_version,
                redis_mode: fullRedisStats.server?.redis_mode,
                os: fullRedisStats.server?.os,
                uptime_in_seconds: fullRedisStats.server?.uptime_in_seconds,
            },
            clients: {
                connected_clients: fullRedisStats.clients?.connected_clients,
            },
            memory: {
                used_memory: fullRedisStats.memory?.used_memory,
                used_memory_peak: fullRedisStats.memory?.used_memory_peak,
                mem_fragmentation_ratio:
                    fullRedisStats.memory?.mem_fragmentation_ratio,
            },
            stats: {
                total_connections_received:
                    fullRedisStats.stats?.total_connections_received,
                total_commands_processed:
                    fullRedisStats.stats?.total_commands_processed,
                keyspace_hits: fullRedisStats.stats?.keyspace_hits,
                keyspace_misses: fullRedisStats.stats?.keyspace_misses,
            },
            keyspace: fullRedisStats.keyspace || {},
            // Add health and connection details
            health: redisHealth,
            connection_details: connectionDetails,
        };
    } catch (err) {
        cliLogger.error(`Failed to get Redis stats: ${err}`);
    }

    return {
        uptime: Math.floor(process.uptime()),
        upSince: startTime,
        localTime: new Date(),
        env: {
            nodeEnv: process.env.NODE_ENV,
            nodeVersion: process.version,
            processName: process.title,
        },
        operatingSystem: {
            systemPlatform: process.platform,
            systemArch: process.arch,
            loadAvg: os
                .loadavg()
                .map((avg) => Number.parseFloat(avg.toFixed(2))),
            totalCPUs: os.cpus().length,
            totalMemoryGB: Math.floor(os.totalmem() / 1024 / 1024 / 1024),
        },
        queueCounts: {
            alliance: allianceQueueCount,
            corporation: corporationQueueCount,
            character: characterQueueCount,
            characterhistory: characterHistoryQueueCount,
            corporationhistory: corporationHistoryQueueCount,
            killmail: killmailQueueCount,
            war: warQueueCount,
            stats: statsQueueCount,
            achievement: achievementQueueCount,
            campaign: campaignQueueCount,
            historicalStats: historicalStatsQueueCount,
        },
        processedCounts: {
            killmails: {
                "1min": await getSingleMinuteProcessingCount(killmailQueue),
                "5min": await getQueueProcessingMetrics(
                    killmailQueue,
                    MetricsTime.FIVE_MINUTES
                ),
                "15min": await getQueueProcessingMetrics(
                    killmailQueue,
                    MetricsTime.FIFTEEN_MINUTES
                ),
                "1hour": await getQueueProcessingMetrics(
                    killmailQueue,
                    MetricsTime.ONE_HOUR
                ),
                "6hours": await getQueueProcessingMetrics(
                    killmailQueue,
                    MetricsTime.ONE_HOUR * 6
                ),
                "12hours": await getQueueProcessingMetrics(
                    killmailQueue,
                    MetricsTime.ONE_HOUR * 12
                ),
                "24hours": await getQueueProcessingMetrics(
                    killmailQueue,
                    MetricsTime.ONE_HOUR * 24
                ),
                "1week": await getQueueProcessingMetrics(
                    killmailQueue,
                    MetricsTime.ONE_HOUR * 24 * 7
                ),
                "1month": await getQueueProcessingMetrics(
                    killmailQueue,
                    MetricsTime.ONE_MONTH
                ),
            },
            alliances: {
                "1min": await getSingleMinuteProcessingCount(allianceQueue),
                "5min": await getQueueProcessingMetrics(
                    allianceQueue,
                    MetricsTime.FIVE_MINUTES
                ),
                "15min": await getQueueProcessingMetrics(
                    allianceQueue,
                    MetricsTime.FIFTEEN_MINUTES
                ),
                "1hour": await getQueueProcessingMetrics(
                    allianceQueue,
                    MetricsTime.ONE_HOUR
                ),
                "6hours": await getQueueProcessingMetrics(
                    allianceQueue,
                    MetricsTime.ONE_HOUR * 6
                ),
                "12hours": await getQueueProcessingMetrics(
                    allianceQueue,
                    MetricsTime.ONE_HOUR * 12
                ),
                "24hours": await getQueueProcessingMetrics(
                    allianceQueue,
                    MetricsTime.ONE_HOUR * 24
                ),
                "1week": await getQueueProcessingMetrics(
                    allianceQueue,
                    MetricsTime.ONE_HOUR * 24 * 7
                ),
                "1month": await getQueueProcessingMetrics(
                    allianceQueue,
                    MetricsTime.ONE_MONTH
                ),
            },
            corporations: {
                "1min": await getSingleMinuteProcessingCount(corporationQueue),
                "5min": await getQueueProcessingMetrics(
                    corporationQueue,
                    MetricsTime.FIVE_MINUTES
                ),
                "15min": await getQueueProcessingMetrics(
                    corporationQueue,
                    MetricsTime.FIFTEEN_MINUTES
                ),
                "1hour": await getQueueProcessingMetrics(
                    corporationQueue,
                    MetricsTime.ONE_HOUR
                ),
                "6hours": await getQueueProcessingMetrics(
                    corporationQueue,
                    MetricsTime.ONE_HOUR * 6
                ),
                "12hours": await getQueueProcessingMetrics(
                    corporationQueue,
                    MetricsTime.ONE_HOUR * 12
                ),
                "24hours": await getQueueProcessingMetrics(
                    corporationQueue,
                    MetricsTime.ONE_HOUR * 24
                ),
                "1week": await getQueueProcessingMetrics(
                    corporationQueue,
                    MetricsTime.ONE_HOUR * 24 * 7
                ),
                "1month": await getQueueProcessingMetrics(
                    corporationQueue,
                    MetricsTime.ONE_MONTH
                ),
            },
            characters: {
                "1min": await getSingleMinuteProcessingCount(characterQueue),
                "5min": await getQueueProcessingMetrics(
                    characterQueue,
                    MetricsTime.FIVE_MINUTES
                ),
                "15min": await getQueueProcessingMetrics(
                    characterQueue,
                    MetricsTime.FIFTEEN_MINUTES
                ),
                "1hour": await getQueueProcessingMetrics(
                    characterQueue,
                    MetricsTime.ONE_HOUR
                ),
                "6hours": await getQueueProcessingMetrics(
                    characterQueue,
                    MetricsTime.ONE_HOUR * 6
                ),
                "12hours": await getQueueProcessingMetrics(
                    characterQueue,
                    MetricsTime.ONE_HOUR * 12
                ),
                "24hours": await getQueueProcessingMetrics(
                    characterQueue,
                    MetricsTime.ONE_HOUR * 24
                ),
                "1week": await getQueueProcessingMetrics(
                    characterQueue,
                    MetricsTime.ONE_HOUR * 24 * 7
                ),
                "1month": await getQueueProcessingMetrics(
                    characterQueue,
                    MetricsTime.ONE_MONTH
                ),
            },
            characterhistory: {
                "1min": await getSingleMinuteProcessingCount(
                    characterHistoryQueue
                ),
                "5min": await getQueueProcessingMetrics(
                    characterHistoryQueue,
                    MetricsTime.FIVE_MINUTES
                ),
                "15min": await getQueueProcessingMetrics(
                    characterHistoryQueue,
                    MetricsTime.FIFTEEN_MINUTES
                ),
                "1hour": await getQueueProcessingMetrics(
                    characterHistoryQueue,
                    MetricsTime.ONE_HOUR
                ),
                "6hours": await getQueueProcessingMetrics(
                    characterHistoryQueue,
                    MetricsTime.ONE_HOUR * 6
                ),
                "12hours": await getQueueProcessingMetrics(
                    characterHistoryQueue,
                    MetricsTime.ONE_HOUR * 12
                ),
                "24hours": await getQueueProcessingMetrics(
                    characterHistoryQueue,
                    MetricsTime.ONE_HOUR * 24
                ),
                "1week": await getQueueProcessingMetrics(
                    characterHistoryQueue,
                    MetricsTime.ONE_HOUR * 24 * 7
                ),
                "1month": await getQueueProcessingMetrics(
                    characterHistoryQueue,
                    MetricsTime.ONE_MONTH
                ),
            },
            corporationhistory: {
                "1min": await getSingleMinuteProcessingCount(
                    corporationHistoryQueue
                ),
                "5min": await getQueueProcessingMetrics(
                    corporationHistoryQueue,
                    MetricsTime.FIVE_MINUTES
                ),
                "15min": await getQueueProcessingMetrics(
                    corporationHistoryQueue,
                    MetricsTime.FIFTEEN_MINUTES
                ),
                "1hour": await getQueueProcessingMetrics(
                    corporationHistoryQueue,
                    MetricsTime.ONE_HOUR
                ),
                "6hours": await getQueueProcessingMetrics(
                    corporationHistoryQueue,
                    MetricsTime.ONE_HOUR * 6
                ),
                "12hours": await getQueueProcessingMetrics(
                    corporationHistoryQueue,
                    MetricsTime.ONE_HOUR * 12
                ),
                "24hours": await getQueueProcessingMetrics(
                    corporationHistoryQueue,
                    MetricsTime.ONE_HOUR * 24
                ),
                "1week": await getQueueProcessingMetrics(
                    corporationHistoryQueue,
                    MetricsTime.ONE_HOUR * 24 * 7
                ),
                "1month": await getQueueProcessingMetrics(
                    corporationHistoryQueue,
                    MetricsTime.ONE_MONTH
                ),
            },
            wars: {
                "1min": await getSingleMinuteProcessingCount(warQueue),
                "5min": await getQueueProcessingMetrics(
                    warQueue,
                    MetricsTime.FIVE_MINUTES
                ),
                "15min": await getQueueProcessingMetrics(
                    warQueue,
                    MetricsTime.FIFTEEN_MINUTES
                ),
                "1hour": await getQueueProcessingMetrics(
                    warQueue,
                    MetricsTime.ONE_HOUR
                ),
                "6hours": await getQueueProcessingMetrics(
                    warQueue,
                    MetricsTime.ONE_HOUR * 6
                ),
                "12hours": await getQueueProcessingMetrics(
                    warQueue,
                    MetricsTime.ONE_HOUR * 12
                ),
                "24hours": await getQueueProcessingMetrics(
                    warQueue,
                    MetricsTime.ONE_HOUR * 24
                ),
                "1week": await getQueueProcessingMetrics(
                    warQueue,
                    MetricsTime.ONE_HOUR * 24 * 7
                ),
                "1month": await getQueueProcessingMetrics(
                    warQueue,
                    MetricsTime.ONE_MONTH
                ),
            },
            stats: {
                "1min": await getSingleMinuteProcessingCount(statsQueue),
                "5min": await getQueueProcessingMetrics(
                    statsQueue,
                    MetricsTime.FIVE_MINUTES
                ),
                "15min": await getQueueProcessingMetrics(
                    statsQueue,
                    MetricsTime.FIFTEEN_MINUTES
                ),
                "1hour": await getQueueProcessingMetrics(
                    statsQueue,
                    MetricsTime.ONE_HOUR
                ),
                "6hours": await getQueueProcessingMetrics(
                    statsQueue,
                    MetricsTime.ONE_HOUR * 6
                ),
                "12hours": await getQueueProcessingMetrics(
                    statsQueue,
                    MetricsTime.ONE_HOUR * 12
                ),
                "24hours": await getQueueProcessingMetrics(
                    statsQueue,
                    MetricsTime.ONE_HOUR * 24
                ),
                "1week": await getQueueProcessingMetrics(
                    statsQueue,
                    MetricsTime.ONE_HOUR * 24 * 7
                ),
                "1month": await getQueueProcessingMetrics(
                    statsQueue,
                    MetricsTime.ONE_MONTH
                ),
            },
            achievements: {
                "1min": await getSingleMinuteProcessingCount(achievementQueue),
                "5min": await getQueueProcessingMetrics(
                    achievementQueue,
                    MetricsTime.FIVE_MINUTES
                ),
                "15min": await getQueueProcessingMetrics(
                    achievementQueue,
                    MetricsTime.FIFTEEN_MINUTES
                ),
                "1hour": await getQueueProcessingMetrics(
                    achievementQueue,
                    MetricsTime.ONE_HOUR
                ),
                "6hours": await getQueueProcessingMetrics(
                    achievementQueue,
                    MetricsTime.ONE_HOUR * 6
                ),
                "12hours": await getQueueProcessingMetrics(
                    achievementQueue,
                    MetricsTime.ONE_HOUR * 12
                ),
                "24hours": await getQueueProcessingMetrics(
                    achievementQueue,
                    MetricsTime.ONE_HOUR * 24
                ),
                "1week": await getQueueProcessingMetrics(
                    achievementQueue,
                    MetricsTime.ONE_HOUR * 24 * 7
                ),
                "1month": await getQueueProcessingMetrics(
                    achievementQueue,
                    MetricsTime.ONE_MONTH
                ),
            },
            campaigns: {
                "1min": await getSingleMinuteProcessingCount(campaignQueue),
                "5min": await getQueueProcessingMetrics(
                    campaignQueue,
                    MetricsTime.FIVE_MINUTES
                ),
                "15min": await getQueueProcessingMetrics(
                    campaignQueue,
                    MetricsTime.FIFTEEN_MINUTES
                ),
                "1hour": await getQueueProcessingMetrics(
                    campaignQueue,
                    MetricsTime.ONE_HOUR
                ),
                "6hours": await getQueueProcessingMetrics(
                    campaignQueue,
                    MetricsTime.ONE_HOUR * 6
                ),
                "12hours": await getQueueProcessingMetrics(
                    campaignQueue,
                    MetricsTime.ONE_HOUR * 12
                ),
                "24hours": await getQueueProcessingMetrics(
                    campaignQueue,
                    MetricsTime.ONE_HOUR * 24
                ),
                "1week": await getQueueProcessingMetrics(
                    campaignQueue,
                    MetricsTime.ONE_HOUR * 24 * 7
                ),
                "1month": await getQueueProcessingMetrics(
                    campaignQueue,
                    MetricsTime.ONE_MONTH
                ),
            },
            historicalStats: {
                "1min": await getSingleMinuteProcessingCount(
                    historicalStatsQueue
                ),
                "5min": await getQueueProcessingMetrics(
                    historicalStatsQueue,
                    MetricsTime.FIVE_MINUTES
                ),
                "15min": await getQueueProcessingMetrics(
                    historicalStatsQueue,
                    MetricsTime.FIFTEEN_MINUTES
                ),
                "1hour": await getQueueProcessingMetrics(
                    historicalStatsQueue,
                    MetricsTime.ONE_HOUR
                ),
                "6hours": await getQueueProcessingMetrics(
                    historicalStatsQueue,
                    MetricsTime.ONE_HOUR * 6
                ),
                "12hours": await getQueueProcessingMetrics(
                    historicalStatsQueue,
                    MetricsTime.ONE_HOUR * 12
                ),
                "24hours": await getQueueProcessingMetrics(
                    historicalStatsQueue,
                    MetricsTime.ONE_HOUR * 24
                ),
                "1week": await getQueueProcessingMetrics(
                    historicalStatsQueue,
                    MetricsTime.ONE_HOUR * 24 * 7
                ),
                "1month": await getQueueProcessingMetrics(
                    historicalStatsQueue,
                    MetricsTime.ONE_MONTH
                ),
            },
        },
        databaseCounts: {
            alliances: allianceCount,
            celestial: celestialCount,
            characters: characterCount,
            corporations: corporationCount,
            comments: commentCount,
            constellations: constellationCount,
            customPrices: customPriceCount,
            factions: factionCount,
            invFlags: invFlagCount,
            invGroups: invGroupCount,
            invTypes: invTypeCount,
            killmails: killmailCount,
            esiKillmails: esiKillmailCount,
            unprocessedCount: esiUnprocessedCount,
            prices: priceCount,
            regions: regionCount,
            solarSystems: solarSystemsCount,
            users: userCount,
            wars: warCount,
            races: raceCount,
            localScan: localScanCount,
            campaigns: campaignCount,
            dScan: dScanCount,
            stats: statsCount,
            savedQuery: savedQueryCount,
            bloodlines: bloodlineCount,
            battles: battleCount,
            characterAchievements: characterAchievementCount,
            historicalStats: historicalStatsCount,
            config: configCount,
        },
        cacheSizes: {
            solarSystemsCache: cacheStats[0],
            regionsCache: cacheStats[1],
            constellationsCache: cacheStats[2],
            customPriceCache: cacheStats[3],
            invGroupsCache: cacheStats[4],
            invFlagsCache: cacheStats[5],
            invTypesCache: cacheStats[6],
            factionsCache: cacheStats[7],
            priceCache: cacheStats[8],
            characterCache: cacheStats[9],
            corporationCache: cacheStats[10],
            allianceCache: cacheStats[11],
            ipxImageCache: ipxCacheCount,
        },
        cacheHits: formattedCacheHits,
        redis: redisStats,
        websocket: websocketStats,
    };
});
