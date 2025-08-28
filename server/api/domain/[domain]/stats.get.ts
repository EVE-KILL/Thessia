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
 * Generate comprehensive domain statistics optimized for speed using separate index-friendly queries
 */
async function generateFastDomainStats(entities: any[], timeFilter: any) {
    const stats: any = {
        mostValuableKills: [],
        topKillersByCharacter: [],
        topKillersByCorporation: [],
        topKillersByAlliance: [],
        shipStats: { destroyed: [] },
        shipGroupStats: [],
        totalKills: 0,
        totalValue: 0,
    };

    try {
        let totalValue = 0;
        const allKillIds = new Set();
        const allKillmails = [];

        // Run separate optimized queries for each entity (like the original approach)
        for (const entity of entities) {
            const entityId = entity.entity_id;
            const entityType = entity.entity_type;

            let victimQuery: any = { ...timeFilter };
            let attackerQuery: any = { ...timeFilter };

            // Build focused queries that use single-field indexes
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

            // Get victim stats and sample killmails
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

            // Get attacker stats and sample killmails
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

            // Collect killmail IDs for deduplication
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

            // Get some sample killmails from each entity for most valuable analysis
            const sampleVictimKills = await Killmails.find(victimQuery)
                .sort({ total_value: -1 })
                .limit(5)
                .select({
                    killmail_id: 1,
                    total_value: 1,
                    kill_time: 1,
                    victim: 1,
                    system_name: 1,
                    region_name: 1,
                })
                .lean();

            const sampleAttackerKills = await Killmails.find(attackerQuery)
                .sort({ total_value: -1 })
                .limit(5)
                .select({
                    killmail_id: 1,
                    total_value: 1,
                    kill_time: 1,
                    victim: 1,
                    system_name: 1,
                    region_name: 1,
                })
                .lean();

            allKillmails.push(...sampleVictimKills, ...sampleAttackerKills);
        }

        // Set basic totals
        stats.totalKills = allKillIds.size;
        stats.totalValue = totalValue;

        // Get top most valuable kills from collected samples, deduplicated
        const uniqueKillmails = Array.from(
            new Map(allKillmails.map((k) => [k.killmail_id, k])).values()
        );
        stats.mostValuableKills = uniqueKillmails
            .sort((a, b) => (b.total_value || 0) - (a.total_value || 0))
            .slice(0, 10);

        // For additional stats, use a lightweight approach with limited data
        // This provides something useful without the complex $or performance issues

        // Get ship group stats from a sample of killmails (not exhaustive but fast)
        const sampleKillmailIds = Array.from(allKillIds).slice(0, 1000); // Sample for performance
        if (sampleKillmailIds.length > 0) {
            const shipGroupStats = await Killmails.aggregate([
                { $match: { killmail_id: { $in: sampleKillmailIds } } },
                {
                    $group: {
                        _id: "$victim.ship_group_name",
                        ship_group_name: { $first: "$victim.ship_group_name" },
                        killed: { $sum: 1 },
                        total_value: { $sum: "$total_value" },
                    },
                },
                { $sort: { killed: -1 } },
                { $limit: 20 },
                {
                    $project: {
                        ship_group_name: 1,
                        killed: 1,
                        total_value: 1,
                        _id: 0,
                    },
                },
            ]);

            stats.shipGroupStats = shipGroupStats || [];
            stats.shipStats = { destroyed: shipGroupStats || [] };

            // Get top attackers from sample (fast approximation)
            const topAttackers = await Killmails.aggregate([
                {
                    $match: {
                        killmail_id: { $in: sampleKillmailIds.slice(0, 500) },
                    },
                },
                { $unwind: "$attackers" },
                {
                    $group: {
                        _id: {
                            character_id: "$attackers.character_id",
                            corporation_id: "$attackers.corporation_id",
                            alliance_id: "$attackers.alliance_id",
                        },
                        character_name: { $first: "$attackers.character_name" },
                        corporation_name: {
                            $first: "$attackers.corporation_name",
                        },
                        alliance_name: { $first: "$attackers.alliance_name" },
                        kills: { $sum: 1 },
                    },
                },
                { $sort: { kills: -1 } },
                { $limit: 30 },
            ]);

            // Split into categories
            const characterMap = new Map();
            const corporationMap = new Map();
            const allianceMap = new Map();

            for (const attacker of topAttackers) {
                // Characters
                if (attacker._id.character_id) {
                    const key = attacker._id.character_id;
                    const existing = characterMap.get(key) || { kills: 0 };
                    characterMap.set(key, {
                        character_id: key,
                        character_name: attacker.character_name,
                        kills: existing.kills + attacker.kills,
                    });
                }

                // Corporations
                if (attacker._id.corporation_id) {
                    const key = attacker._id.corporation_id;
                    const existing = corporationMap.get(key) || { kills: 0 };
                    corporationMap.set(key, {
                        corporation_id: key,
                        corporation_name: attacker.corporation_name,
                        kills: existing.kills + attacker.kills,
                    });
                }

                // Alliances
                if (attacker._id.alliance_id) {
                    const key = attacker._id.alliance_id;
                    const existing = allianceMap.get(key) || { kills: 0 };
                    allianceMap.set(key, {
                        alliance_id: key,
                        alliance_name: attacker.alliance_name,
                        kills: existing.kills + attacker.kills,
                    });
                }
            }

            stats.topKillersByCharacter = Array.from(characterMap.values())
                .sort((a, b) => b.kills - a.kills)
                .slice(0, 10);

            stats.topKillersByCorporation = Array.from(corporationMap.values())
                .sort((a, b) => b.kills - a.kills)
                .slice(0, 10);

            stats.topKillersByAlliance = Array.from(allianceMap.values())
                .sort((a, b) => b.kills - a.kills)
                .slice(0, 10);
        }
    } catch (error) {
        console.error("Error generating domain stats:", error);
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
