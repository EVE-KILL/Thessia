import { createHash } from "crypto";

/**
 * Create time filter for MongoDB queries
 */
function createTimeFilter(timeRange: string) {
    const query: any = {};

    if (timeRange && timeRange !== "all") {
        const timeRanges = {
            "1d": 1,
            "7d": 7,
            "14d": 14,
            "30d": 30,
            "90d": 90,
        };

        const days = timeRanges[timeRange as keyof typeof timeRanges];
        if (days) {
            const timeFrom = new Date();
            timeFrom.setDate(timeFrom.getDate() - days);
            timeFrom.setHours(0, 0, 0, 0);

            query.kill_time = { $gte: timeFrom };
        }
    }

    return query;
}

/**
 * Generate ultra-lightweight domain statistics optimized for speed using separate index-friendly queries
 */
async function generateFastDomainStats(entities: any[], timeFilter: any) {
    const stats: any = {
        mostValuableKills: [],
        topKillersByCharacter: [],
        topKillersByCorporation: [],
        topKillersByAlliance: [],
        shipStats: {},
        totalKills: 0,
        totalValue: 0,
    };

    try {
        console.log(
            "🔍 Running separate optimized queries for entities:",
            entities.length
        );
        console.log("🕐 Time filter:", JSON.stringify(timeFilter, null, 2));

        let totalKills = 0;
        let totalValue = 0;
        const allKillIds = new Set();

        // Run separate queries for each entity type - this allows MongoDB to use specific indexes
        for (const entity of entities) {
            const entityId = entity.entity_id;
            const entityType = entity.entity_type;

            console.log(`🎯 Querying ${entityType} ${entityId}`);

            let victimQuery: any = { ...timeFilter };
            let attackerQuery: any = { ...timeFilter };

            // Build focused queries that can use single-field indexes
            if (entityType === "character") {
                victimQuery["victim.character_id"] = entityId;
                attackerQuery["attackers.character_id"] = entityId;
            } else if (entityType === "corporation") {
                victimQuery["victim.corporation_id"] = entityId;
                attackerQuery["attackers.corporation_id"] = entityId;
            } else if (entityType === "alliance") {
                victimQuery["victim.alliance_id"] = entityId;
                attackerQuery["attackers.alliance_id"] = entityId;
            }

            // Count victims (using victim_*_id_1 indexes)
            const victimCount = await Killmails.countDocuments(victimQuery);
            console.log(`📊 ${entityType} ${entityId} victims: ${victimCount}`);

            // Count attackers (using attackers_*_id_1 indexes)
            const attackerCount = await Killmails.countDocuments(attackerQuery);
            console.log(
                `📊 ${entityType} ${entityId} attacker kills: ${attackerCount}`
            );

            // Use aggregation to get actual totals and values (no sampling, no limits)
            const [victimStats] = await Killmails.aggregate([
                { $match: victimQuery },
                {
                    $group: {
                        _id: null,
                        totalKills: { $sum: 1 },
                        totalValue: { $sum: "$total_value" },
                        killmailIds: { $addToSet: "$killmail_id" },
                    },
                },
            ]);

            const [attackerStats] = await Killmails.aggregate([
                { $match: attackerQuery },
                {
                    $group: {
                        _id: null,
                        totalKills: { $sum: 1 },
                        totalValue: { $sum: "$total_value" },
                        killmailIds: { $addToSet: "$killmail_id" },
                    },
                },
            ]);

            // Add killmail IDs to set for deduplication
            if (victimStats?.killmailIds) {
                victimStats.killmailIds.forEach((id: any) =>
                    allKillIds.add(id)
                );
                totalValue += victimStats.totalValue || 0;
            }

            if (attackerStats?.killmailIds) {
                attackerStats.killmailIds.forEach((id: any) =>
                    allKillIds.add(id)
                );
                totalValue += attackerStats.totalValue || 0;
            }
        }

        // Use the deduplicated Set size for accurate kill count
        stats.totalKills = allKillIds.size;
        stats.totalValue = totalValue;

        console.log(
            `📈 Final stats: ${
                stats.totalKills
            } unique kills, ${totalValue.toLocaleString()} ISK`
        );

        // Get a few most valuable kills using a simple query with total_value index
        const mostValuableKills = await Killmails.find(timeFilter)
            .sort({ total_value: -1 })
            .limit(3)
            .select({
                killmail_id: 1,
                total_value: 1,
                kill_time: 1,
                victim: 1,
                system_name: 1,
                region_name: 1,
            })
            .lean();

        stats.mostValuableKills = mostValuableKills || [];

        // Return minimal data to get something working fast
        stats.topKillersByCharacter = [];
        stats.topKillersByCorporation = [];
        stats.topKillersByAlliance = [];
        stats.shipStats = { destroyed: [] };
        stats.shipGroupStats = [];
    } catch (error) {
        console.error("Error generating fast domain stats:", error);
    }

    return stats;
}

export default defineCachedEventHandler(
    async (event) => {
        try {
            const domain = getRouterParam(event as any, "domain");
            if (!domain) {
                throw createError({
                    statusCode: 400,
                    statusMessage: "Domain parameter is required",
                });
            }

            // Get query parameters
            const query = getQuery(event as any);
            const timeRange = (query.timeRange as string) || "7d";
            const entityFilter = query.entityFilter as string;

            // Get domain configuration
            const domainConfig = await CustomDomains.findOne({
                domain: domain.toLowerCase(),
                active: true,
                verified: true,
            });

            if (!domainConfig) {
                throw createError({
                    statusCode: 404,
                    statusMessage: "Domain not found or not active",
                });
            }

            // Get entities from domain config
            let entities = domainConfig.entities || [];
            if (entities.length === 0) {
                throw createError({
                    statusCode: 400,
                    statusMessage: "No entities configured for domain",
                });
            }

            // Filter to specific entity if requested
            if (entityFilter) {
                const [entityType, entityIdStr] = entityFilter.split(":");
                const entityId = parseInt(entityIdStr);
                if (entityType && entityId) {
                    const specificEntity = entities.find(
                        (e: any) =>
                            e.entity_type === entityType &&
                            e.entity_id === entityId
                    );
                    if (specificEntity) {
                        entities = [specificEntity];
                    }
                }
            }

            // Create time filter for optimized queries
            const timeFilter = createTimeFilter(timeRange);

            // Generate fast domain statistics using separate optimized queries
            const stats = await generateFastDomainStats(entities, timeFilter);

            // Add domain-specific metadata
            const domainStats = {
                ...stats,
                domain_info: {
                    domain: domain,
                    entity_count: entities.length,
                    time_range: timeRange,
                    entity_filter: entityFilter || null,
                    primary_entity:
                        entities.find((e: any) => e.primary) || entities[0],
                },
            };

            return domainStats;
        } catch (error: any) {
            console.error("Error generating domain stats:", error);

            // Forward HTTP errors
            if (error.statusCode) {
                throw error;
            }

            // Otherwise, create a generic error
            throw createError({
                statusCode: 500,
                statusMessage: "Error generating domain statistics",
                message: error.message || "Error generating domain statistics",
            });
        }
    },
    {
        maxAge: 300,
        staleMaxAge: 0,
        swr: true,
        base: "redis",
        shouldBypassCache: (event) => {
            return true;
        },
        getKey: (event) => {
            const domain = getRouterParam(event as any, "domain");
            const query = getQuery(event as any);
            const timeRange = query?.timeRange || "7d";
            const entityFilter = query?.entityFilter || "";

            // Create a hash of the parameters to avoid key length issues
            const keyContent = `domain:${domain}:${timeRange}:${entityFilter}:fast:v6`;
            const hash = createHash("sha256")
                .update(keyContent)
                .digest("hex")
                .substring(0, 16);

            return `domain:stats:${hash}`;
        },
    }
);
