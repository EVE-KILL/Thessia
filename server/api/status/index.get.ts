import { MetricsTime } from "bullmq";
import os from "node:os";
import { cliLogger } from "~/server/helpers/Logger";
import { createQueue } from "~/server/helpers/Queue";
import { CACHE_NAMESPACES, getCacheHitCount, getCacheSize } from "~/server/helpers/RuntimeCache";
import { RedisStorage } from "~/server/helpers/Storage";

const startTime = new Date();
export default defineCachedEventHandler(async () => {
    const allianceQueue = createQueue("alliance");
    const corporationQueue = createQueue("corporation");
    const characterQueue = createQueue("character");
    const characterHistoryQueue = createQueue("characterhistory");
    const corporationHistoryQueue = createQueue("corporationhistory");
    const killmailQueue = createQueue("killmail");
    const warQueue = createQueue("war");
    const statsQueue = createQueue("stats");

    const [
        allianceQueueCount,
        corporationQueueCount,
        characterQueueCount,
        characterHistoryQueueCount,
        corporationHistoryQueueCount,
        killmailQueueCount,
        warQueueCount,
        statsQueueCount, // Added stats queue count
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
    ] = await Promise.all([
        allianceQueue.count(),
        corporationQueue.count(),
        characterQueue.count(),
        characterHistoryQueue.count(),
        corporationHistoryQueue.count(),
        killmailQueue.count(),
        warQueue.count(),
        statsQueue.count(), // Added stats queue count fetch
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
    ]);

    // Get IPX cache count from Redis
    let ipxCacheCount = 0;
    try {
        const redisStorage = RedisStorage.getInstance();
        // Count keys with the 'ipx:image:' prefix
        ipxCacheCount = await redisStorage.client.keys("ipx:image:*").then((keys) => keys.length);
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

    // No more formatting here - return raw numbers
    const cacheHits = {
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

    // Get Redis stats
    let redisStats = {};
    try {
        const redisStorage = RedisStorage.getInstance();
        const fullRedisStats = await redisStorage.getRedisStats();

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
                mem_fragmentation_ratio: fullRedisStats.memory?.mem_fragmentation_ratio,
            },
            stats: {
                total_connections_received: fullRedisStats.stats?.total_connections_received,
                total_commands_processed: fullRedisStats.stats?.total_commands_processed,
                keyspace_hits: fullRedisStats.stats?.keyspace_hits,
                keyspace_misses: fullRedisStats.stats?.keyspace_misses,
            },
            keyspace: fullRedisStats.keyspace || {},
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
            loadAvg: os.loadavg().map((avg) => Number.parseFloat(avg.toFixed(2))),
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
            stats: statsQueueCount, // Added stats queue count to output
        },
        processedCounts: {
            killmails: {
                "1min":
                    Number(
                        (await killmailQueue.getMetrics("completed", 0, MetricsTime.ONE_MINUTE)).data[0],
                    ) || 0,
                "5min": Number(
                    (await killmailQueue.getMetrics("completed", 0, MetricsTime.FIVE_MINUTES)).data
                        .slice(1)
                        .reduce((acc, cur) => Number(acc) + Number(cur), 0),
                ),
                "15min": Number(
                    (await killmailQueue.getMetrics("completed", 0, MetricsTime.FIFTEEN_MINUTES)).data
                        .slice(1)
                        .reduce((acc, cur) => Number(acc) + Number(cur), 0),
                ),
                "1hour": Number(
                    (await killmailQueue.getMetrics("completed", 0, MetricsTime.ONE_HOUR)).data
                        .slice(1)
                        .reduce((acc, cur) => Number(acc) + Number(cur), 0),
                ),
                "6hours": Number(
                    (await killmailQueue.getMetrics("completed", 0, MetricsTime.ONE_HOUR * 6)).data
                        .slice(1)
                        .reduce((acc, cur) => Number(acc) + Number(cur), 0),
                ),
                "12hours": Number(
                    (await killmailQueue.getMetrics("completed", 0, MetricsTime.ONE_HOUR * 12)).data
                        .slice(1)
                        .reduce((acc, cur) => Number(acc) + Number(cur), 0),
                ),
                "24hours": Number(
                    (await killmailQueue.getMetrics("completed", 0, MetricsTime.ONE_HOUR * 24)).data
                        .slice(1)
                        .reduce((acc, cur) => Number(acc) + Number(cur), 0),
                ),
                "1week": Number(
                    (await killmailQueue.getMetrics("completed", 0, MetricsTime.ONE_HOUR * 24 * 7)).data
                        .slice(1)
                        .reduce((acc, cur) => Number(acc) + Number(cur), 0),
                ),
                "1month": Number(
                    (await killmailQueue.getMetrics("completed", 0, MetricsTime.ONE_MONTH)).data
                        .slice(1)
                        .reduce((acc, cur) => Number(acc) + Number(cur), 0),
                ),
            },
            alliances: {
                "1min":
                    Number(
                        (await allianceQueue.getMetrics("completed", 0, MetricsTime.ONE_MINUTE)).data[0],
                    ) || 0,
                "5min": Number(
                    (await allianceQueue.getMetrics("completed", 0, MetricsTime.FIVE_MINUTES)).data
                        .slice(1)
                        .reduce((acc, cur) => Number(acc) + Number(cur), 0),
                ),
                "15min": Number(
                    (await allianceQueue.getMetrics("completed", 0, MetricsTime.FIFTEEN_MINUTES)).data
                        .slice(1)
                        .reduce((acc, cur) => Number(acc) + Number(cur), 0),
                ),
                "1hour": Number(
                    (await allianceQueue.getMetrics("completed", 0, MetricsTime.ONE_HOUR)).data
                        .slice(1)
                        .reduce((acc, cur) => Number(acc) + Number(cur), 0),
                ),
                "6hours": Number(
                    (await allianceQueue.getMetrics("completed", 0, MetricsTime.ONE_HOUR * 6)).data
                        .slice(1)
                        .reduce((acc, cur) => Number(acc) + Number(cur), 0),
                ),
                "12hours": Number(
                    (await allianceQueue.getMetrics("completed", 0, MetricsTime.ONE_HOUR * 12)).data
                        .slice(1)
                        .reduce((acc, cur) => Number(acc) + Number(cur), 0),
                ),
                "24hours": Number(
                    (await allianceQueue.getMetrics("completed", 0, MetricsTime.ONE_HOUR * 24)).data
                        .slice(1)
                        .reduce((acc, cur) => Number(acc) + Number(cur), 0),
                ),
                "1week": Number(
                    (await allianceQueue.getMetrics("completed", 0, MetricsTime.ONE_HOUR * 24 * 7)).data
                        .slice(1)
                        .reduce((acc, cur) => Number(acc) + Number(cur), 0),
                ),
                "1month": Number(
                    (await allianceQueue.getMetrics("completed", 0, MetricsTime.ONE_MONTH)).data
                        .slice(1)
                        .reduce((acc, cur) => Number(acc) + Number(cur), 0),
                ),
            },
            corporations: {
                "1min":
                    Number(
                        (await corporationQueue.getMetrics("completed", 0, MetricsTime.ONE_MINUTE)).data[0],
                    ) || 0,
                "5min": Number(
                    (await corporationQueue.getMetrics("completed", 0, MetricsTime.FIVE_MINUTES)).data
                        .slice(1)
                        .reduce((acc, cur) => Number(acc) + Number(cur), 0),
                ),
                "15min": Number(
                    (await corporationQueue.getMetrics("completed", 0, MetricsTime.FIFTEEN_MINUTES)).data
                        .slice(1)
                        .reduce((acc, cur) => Number(acc) + Number(cur), 0),
                ),
                "1hour": Number(
                    (await corporationQueue.getMetrics("completed", 0, MetricsTime.ONE_HOUR)).data
                        .slice(1)
                        .reduce((acc, cur) => Number(acc) + Number(cur), 0),
                ),
                "6hours": Number(
                    (await corporationQueue.getMetrics("completed", 0, MetricsTime.ONE_HOUR * 6)).data
                        .slice(1)
                        .reduce((acc, cur) => Number(acc) + Number(cur), 0),
                ),
                "12hours": Number(
                    (await corporationQueue.getMetrics("completed", 0, MetricsTime.ONE_HOUR * 12)).data
                        .slice(1)
                        .reduce((acc, cur) => Number(acc) + Number(cur), 0),
                ),
                "24hours": Number(
                    (await corporationQueue.getMetrics("completed", 0, MetricsTime.ONE_HOUR * 24)).data
                        .slice(1)
                        .reduce((acc, cur) => Number(acc) + Number(cur), 0),
                ),
                "1week": Number(
                    (await corporationQueue.getMetrics("completed", 0, MetricsTime.ONE_HOUR * 24 * 7)).data
                        .slice(1)
                        .reduce((acc, cur) => Number(acc) + Number(cur), 0),
                ),
                "1month": Number(
                    (await corporationQueue.getMetrics("completed", 0, MetricsTime.ONE_MONTH)).data
                        .slice(1)
                        .reduce((acc, cur) => Number(acc) + Number(cur), 0),
                ),
            },
            characters: {
                "1min":
                    Number(
                        (await characterQueue.getMetrics("completed", 0, MetricsTime.ONE_MINUTE)).data[0],
                    ) || 0,
                "5min": Number(
                    (await characterQueue.getMetrics("completed", 0, MetricsTime.FIVE_MINUTES)).data
                        .slice(1)
                        .reduce((acc, cur) => Number(acc) + Number(cur), 0),
                ),
                "15min": Number(
                    (await characterQueue.getMetrics("completed", 0, MetricsTime.FIFTEEN_MINUTES)).data
                        .slice(1)
                        .reduce((acc, cur) => Number(acc) + Number(cur), 0),
                ),
                "1hour": Number(
                    (await characterQueue.getMetrics("completed", 0, MetricsTime.ONE_HOUR)).data
                        .slice(1)
                        .reduce((acc, cur) => Number(acc) + Number(cur), 0),
                ),
                "6hours": Number(
                    (await characterQueue.getMetrics("completed", 0, MetricsTime.ONE_HOUR * 6)).data
                        .slice(1)
                        .reduce((acc, cur) => Number(acc) + Number(cur), 0),
                ),
                "12hours": Number(
                    (await characterQueue.getMetrics("completed", 0, MetricsTime.ONE_HOUR * 12)).data
                        .slice(1)
                        .reduce((acc, cur) => Number(acc) + Number(cur), 0),
                ),
                "24hours": Number(
                    (await characterQueue.getMetrics("completed", 0, MetricsTime.ONE_HOUR * 24)).data
                        .slice(1)
                        .reduce((acc, cur) => Number(acc) + Number(cur), 0),
                ),
                "1week": Number(
                    (await characterQueue.getMetrics("completed", 0, MetricsTime.ONE_HOUR * 24 * 7)).data
                        .slice(1)
                        .reduce((acc, cur) => Number(acc) + Number(cur), 0),
                ),
                "1month": Number(
                    (await characterQueue.getMetrics("completed", 0, MetricsTime.ONE_MONTH)).data
                        .slice(1)
                        .reduce((acc, cur) => Number(acc) + Number(cur), 0),
                ),
            },
            characterhistory: {
                "1min":
                    Number(
                        (await characterHistoryQueue.getMetrics("completed", 0, MetricsTime.ONE_MINUTE))
                            .data[0],
                    ) || 0,
                "5min": Number(
                    (await characterHistoryQueue.getMetrics("completed", 0, MetricsTime.FIVE_MINUTES)).data
                        .slice(1)
                        .reduce((acc, cur) => Number(acc) + Number(cur), 0),
                ),
                "15min": Number(
                    (await characterHistoryQueue.getMetrics("completed", 0, MetricsTime.FIFTEEN_MINUTES)).data
                        .slice(1)
                        .reduce((acc, cur) => Number(acc) + Number(cur), 0),
                ),
                "1hour": Number(
                    (await characterHistoryQueue.getMetrics("completed", 0, MetricsTime.ONE_HOUR)).data
                        .slice(1)
                        .reduce((acc, cur) => Number(acc) + Number(cur), 0),
                ),
                "6hours": Number(
                    (await characterHistoryQueue.getMetrics("completed", 0, MetricsTime.ONE_HOUR * 6)).data
                        .slice(1)
                        .reduce((acc, cur) => Number(acc) + Number(cur), 0),
                ),
                "12hours": Number(
                    (await characterHistoryQueue.getMetrics("completed", 0, MetricsTime.ONE_HOUR * 12)).data
                        .slice(1)
                        .reduce((acc, cur) => Number(acc) + Number(cur), 0),
                ),
                "24hours": Number(
                    (await characterHistoryQueue.getMetrics("completed", 0, MetricsTime.ONE_HOUR * 24)).data
                        .slice(1)
                        .reduce((acc, cur) => Number(acc) + Number(cur), 0),
                ),
                "1week": Number(
                    (
                        await characterHistoryQueue.getMetrics("completed", 0, MetricsTime.ONE_HOUR * 24 * 7)
                    ).data
                        .slice(1)
                        .reduce((acc, cur) => Number(acc) + Number(cur), 0),
                ),
                "1month": Number(
                    (await characterHistoryQueue.getMetrics("completed", 0, MetricsTime.ONE_MONTH)).data
                        .slice(1)
                        .reduce((acc, cur) => Number(acc) + Number(cur), 0),
                ),
            },
            corporationhistory: {
                "1min":
                    Number(
                        (await corporationHistoryQueue.getMetrics("completed", 0, MetricsTime.ONE_MINUTE))
                            .data[0],
                    ) || 0,
                "5min": Number(
                    (await corporationHistoryQueue.getMetrics("completed", 0, MetricsTime.FIVE_MINUTES)).data
                        .slice(1)
                        .reduce((acc, cur) => Number(acc) + Number(cur), 0),
                ),
                "15min": Number(
                    (
                        await corporationHistoryQueue.getMetrics("completed", 0, MetricsTime.FIFTEEN_MINUTES)
                    ).data
                        .slice(1)
                        .reduce((acc, cur) => Number(acc) + Number(cur), 0),
                ),
                "1hour": Number(
                    (await corporationHistoryQueue.getMetrics("completed", 0, MetricsTime.ONE_HOUR)).data
                        .slice(1)
                        .reduce((acc, cur) => Number(acc) + Number(cur), 0),
                ),
                "6hours": Number(
                    (await corporationHistoryQueue.getMetrics("completed", 0, MetricsTime.ONE_HOUR * 6)).data
                        .slice(1)
                        .reduce((acc, cur) => Number(acc) + Number(cur), 0),
                ),
                "12hours": Number(
                    (await corporationHistoryQueue.getMetrics("completed", 0, MetricsTime.ONE_HOUR * 12)).data
                        .slice(1)
                        .reduce((acc, cur) => Number(acc) + Number(cur), 0),
                ),
                "24hours": Number(
                    (await corporationHistoryQueue.getMetrics("completed", 0, MetricsTime.ONE_HOUR * 24)).data
                        .slice(1)
                        .reduce((acc, cur) => Number(acc) + Number(cur), 0),
                ),
                "1week": Number(
                    (
                        await corporationHistoryQueue.getMetrics("completed", 0, MetricsTime.ONE_HOUR * 24 * 7)
                    ).data
                        .slice(1)
                        .reduce((acc, cur) => Number(acc) + Number(cur), 0),
                ),
                "1month": Number(
                    (await corporationHistoryQueue.getMetrics("completed", 0, MetricsTime.ONE_MONTH)).data
                        .slice(1)
                        .reduce((acc, cur) => Number(acc) + Number(cur), 0),
                ),
            },
            wars: {
                "1min":
                    Number((await warQueue.getMetrics("completed", 0, MetricsTime.ONE_MINUTE)).data[0]) || 0,
                "5min": Number(
                    (await warQueue.getMetrics("completed", 0, MetricsTime.FIVE_MINUTES)).data
                        .slice(1)
                        .reduce((acc, cur) => Number(acc) + Number(cur), 0),
                ),
                "15min": Number(
                    (await warQueue.getMetrics("completed", 0, MetricsTime.FIFTEEN_MINUTES)).data
                        .slice(1)
                        .reduce((acc, cur) => Number(acc) + Number(cur), 0),
                ),
                "1hour": Number(
                    (await warQueue.getMetrics("completed", 0, MetricsTime.ONE_HOUR)).data
                        .slice(1)
                        .reduce((acc, cur) => Number(acc) + Number(cur), 0),
                ),
                "6hours": Number(
                    (await warQueue.getMetrics("completed", 0, MetricsTime.ONE_HOUR * 6)).data
                        .slice(1)
                        .reduce((acc, cur) => Number(acc) + Number(cur), 0),
                ),
                "12hours": Number(
                    (await warQueue.getMetrics("completed", 0, MetricsTime.ONE_HOUR * 12)).data
                        .slice(1)
                        .reduce((acc, cur) => Number(acc) + Number(cur), 0),
                ),
                "24hours": Number(
                    (await warQueue.getMetrics("completed", 0, MetricsTime.ONE_HOUR * 24)).data
                        .slice(1)
                        .reduce((acc, cur) => Number(acc) + Number(cur), 0),
                ),
                "1week": Number(
                    (await warQueue.getMetrics("completed", 0, MetricsTime.ONE_HOUR * 24 * 7)).data
                        .slice(1)
                        .reduce((acc, cur) => Number(acc) + Number(cur), 0),
                ),
                "1month": Number(
                    (await warQueue.getMetrics("completed", 0, MetricsTime.ONE_MONTH)).data
                        .slice(1)
                        .reduce((acc, cur) => Number(acc) + Number(cur), 0),
                ),
            },
            stats: { // Add stats processing metrics
                "1min":
                    Number((await statsQueue.getMetrics("completed", 0, MetricsTime.ONE_MINUTE)).data[0]) || 0,
                "5min": Number(
                    (await statsQueue.getMetrics("completed", 0, MetricsTime.FIVE_MINUTES)).data
                        .slice(1)
                        .reduce((acc, cur) => Number(acc) + Number(cur), 0),
                ),
                "15min": Number(
                    (await statsQueue.getMetrics("completed", 0, MetricsTime.FIFTEEN_MINUTES)).data
                        .slice(1)
                        .reduce((acc, cur) => Number(acc) + Number(cur), 0),
                ),
                "1hour": Number(
                    (await statsQueue.getMetrics("completed", 0, MetricsTime.ONE_HOUR)).data
                        .slice(1)
                        .reduce((acc, cur) => Number(acc) + Number(cur), 0),
                ),
                "6hours": Number(
                    (await statsQueue.getMetrics("completed", 0, MetricsTime.ONE_HOUR * 6)).data
                        .slice(1)
                        .reduce((acc, cur) => Number(acc) + Number(cur), 0),
                ),
                "12hours": Number(
                    (await statsQueue.getMetrics("completed", 0, MetricsTime.ONE_HOUR * 12)).data
                        .slice(1)
                        .reduce((acc, cur) => Number(acc) + Number(cur), 0),
                ),
                "24hours": Number(
                    (await statsQueue.getMetrics("completed", 0, MetricsTime.ONE_HOUR * 24)).data
                        .slice(1)
                        .reduce((acc, cur) => Number(acc) + Number(cur), 0),
                ),
                "1week": Number(
                    (await statsQueue.getMetrics("completed", 0, MetricsTime.ONE_HOUR * 24 * 7)).data
                        .slice(1)
                        .reduce((acc, cur) => Number(acc) + Number(cur), 0),
                ),
                "1month": Number(
                    (await statsQueue.getMetrics("completed", 0, MetricsTime.ONE_MONTH)).data
                        .slice(1)
                        .reduce((acc, cur) => Number(acc) + Number(cur), 0),
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
        cacheHits,
        redis: redisStats,
    };
}, {
    maxAge: 60, // Using a maxAge of 60 seconds for status information
    staleMaxAge: -1,
    swr: true,
    base: "redis", // Assuming redis is the default cache base
    shouldBypassCache: (event) => {
        return process.env.NODE_ENV !== "production";
    },
    getKey: (event) => {
        // Construct a unique key for this endpoint.
        // For `server/api/status/index.get.ts`, if it takes no parameters,
        // a static key like "status:index" would be appropriate.
        // If it takes query parameters, include them in the key.
        return "status:index"; // Adjust if parameters are used
    }
});
