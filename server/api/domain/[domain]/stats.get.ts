import { createHash } from "crypto";

/**
 * Convert domain entities to MongoDB filter for fast queries
 */
function domainEntitiesToMongoFilter(entities: any[], options: any = {}) {
    if (!entities || entities.length === 0) return {};

    const entityConditions: any[] = [];

    entities.forEach((entity: any) => {
        const entityId = entity.entity_id;
        const entityType = entity.entity_type;

        const entityCondition: any[] = [];

        // Add victim conditions
        if (entityType === "character") {
            entityCondition.push({ "victim.character_id": entityId });
        } else if (entityType === "corporation") {
            entityCondition.push({ "victim.corporation_id": entityId });
        } else if (entityType === "alliance") {
            entityCondition.push({ "victim.alliance_id": entityId });
        }

        // Add attacker conditions
        if (entityType === "character") {
            entityCondition.push({ "attackers.character_id": entityId });
        } else if (entityType === "corporation") {
            entityCondition.push({ "attackers.corporation_id": entityId });
        } else if (entityType === "alliance") {
            entityCondition.push({ "attackers.alliance_id": entityId });
        }

        if (entityCondition.length > 0) {
            entityConditions.push({ $or: entityCondition });
        }
    });

    const query: any = {};

    // Add entity filter
    if (entityConditions.length > 0) {
        query.$or = entityConditions;
    }

    // Add time range filter
    if (options.timeRange && options.timeRange !== "all") {
        const timeRanges = {
            "24h": 1,
            "7d": 7,
            "30d": 30,
            "90d": 90,
        };

        const days = timeRanges[options.timeRange as keyof typeof timeRanges];
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
 * Generate lightweight domain statistics optimized for performance
 */
async function generateFastDomainStats(mongoQuery: any) {
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
        // 1. Get most valuable kills - only where entity is ATTACKER (not victim)
        const attackerOnlyQuery = { ...mongoQuery };

        // For most valuable kills, filter out victim conditions, keep only attacker conditions
        if (mongoQuery.$or) {
            attackerOnlyQuery.$or = mongoQuery.$or
                .map((entityCondition: any) => {
                    if (entityCondition.$or) {
                        // Filter to keep only attacker conditions (remove victim conditions)
                        const attackerConditions = entityCondition.$or.filter(
                            (condition: any) => {
                                const key = Object.keys(condition)[0];
                                return key.startsWith("attackers.");
                            }
                        );

                        // Only return if we have attacker conditions
                        if (attackerConditions.length > 0) {
                            return { $or: attackerConditions };
                        }
                    }
                    return null;
                })
                .filter(Boolean);
        }

        const mostValueableKills = await Killmails.find(attackerOnlyQuery)
            .sort({ total_value: -1 })
            .limit(10)
            .select({
                killmail_id: 1,
                total_value: 1,
                kill_time: 1,
                victim: 1,
                system_name: 1,
                system_security: 1,
                region_name: 1,
            });

        stats.mostValuableKills = mostValueableKills;

        const basicStats = await Killmails.aggregate([
            { $match: mongoQuery },
            {
                $group: {
                    _id: null,
                    totalKills: { $sum: 1 },
                    totalValue: { $sum: "$total_value" },
                },
            },
        ]);

        if (basicStats.length > 0) {
            stats.totalKills = basicStats[0].totalKills;
            stats.totalValue = basicStats[0].totalValue;
        }

        // 3. Top killers by character (limit 10, only get finalblow attackers for performance)
        const topCharacters = await Killmails.aggregate([
            { $match: mongoQuery },
            { $unwind: "$attackers" },
            { $match: { "attackers.final_blow": true } },
            {
                $group: {
                    _id: {
                        character_id: "$attackers.character_id",
                        character_name: "$attackers.character_name",
                    },
                    kills: { $sum: 1 },
                    damage: { $sum: "$attackers.damage_done" },
                },
            },
            { $sort: { kills: -1 } },
            { $limit: 10 },
            {
                $project: {
                    character_id: "$_id.character_id",
                    character_name: "$_id.character_name",
                    kills: 1,
                    damage: 1,
                    _id: 0,
                },
            },
        ]);

        stats.topKillersByCharacter = topCharacters;

        // 4. Top killers by corporation (limit 10)
        const topCorporations = await Killmails.aggregate([
            { $match: mongoQuery },
            { $unwind: "$attackers" },
            {
                $group: {
                    _id: {
                        corporation_id: "$attackers.corporation_id",
                        corporation_name: "$attackers.corporation_name",
                    },
                    kills: { $sum: 1 },
                },
            },
            { $sort: { kills: -1 } },
            { $limit: 10 },
            {
                $project: {
                    corporation_id: "$_id.corporation_id",
                    corporation_name: "$_id.corporation_name",
                    kills: 1,
                    _id: 0,
                },
            },
        ]);

        stats.topKillersByCorporation = topCorporations;

        // 5. Top killers by alliance (limit 10)
        const topAlliances = await Killmails.aggregate([
            { $match: mongoQuery },
            { $unwind: "$attackers" },
            { $match: { "attackers.alliance_id": { $ne: null, $gt: 0 } } },
            {
                $group: {
                    _id: {
                        alliance_id: "$attackers.alliance_id",
                        alliance_name: "$attackers.alliance_name",
                    },
                    kills: { $sum: 1 },
                },
            },
            { $sort: { kills: -1 } },
            { $limit: 10 },
            {
                $project: {
                    alliance_id: "$_id.alliance_id",
                    alliance_name: "$_id.alliance_name",
                    kills: 1,
                    _id: 0,
                },
            },
        ]);

        stats.topKillersByAlliance = topAlliances;

        // 6. Ship statistics (limit to top 20 ship types for performance)
        const shipStatsData = await Killmails.aggregate([
            { $match: mongoQuery },
            {
                $group: {
                    _id: {
                        ship_id: "$victim.ship_id",
                        // Handle nested objects properly - extract the actual string values
                        ship_name: {
                            $ifNull: [
                                "$victim.ship_name.en",
                                "$victim.ship_name",
                            ],
                        },
                        ship_group_name: {
                            $ifNull: [
                                "$victim.ship_group_name.en",
                                "$victim.ship_group_name",
                            ],
                        },
                    },
                    destroyed: { $sum: 1 },
                    totalValue: { $sum: "$total_value" },
                },
            },
            { $sort: { destroyed: -1 } },
            { $limit: 20 },
        ]);

        // Convert to format expected by frontend components
        stats.shipStats = {
            destroyed: shipStatsData.map((ship) => ({
                ship_id: ship._id.ship_id,
                ship_name: ship._id.ship_name,
                ship_group_name: ship._id.ship_group_name,
                count: ship.destroyed,
                value: ship.totalValue,
            })),
        };

        // Also create shipGroupStats for KillsShipStats component compatibility
        // Group by ship_group_name and sum counts
        const shipGroupMap = new Map();
        shipStatsData.forEach((ship) => {
            const groupName = ship._id.ship_group_name;
            const groupId = ship._id.ship_id; // Use ship_id as fallback for group_id

            if (shipGroupMap.has(groupName)) {
                shipGroupMap.get(groupName).killed += ship.destroyed;
            } else {
                shipGroupMap.set(groupName, {
                    ship_group_id: groupId,
                    ship_group_name: groupName,
                    killed: ship.destroyed,
                });
            }
        });

        stats.shipGroupStats = Array.from(shipGroupMap.values())
            .sort((a, b) => b.killed - a.killed) // Sort by kills descending
            .slice(0, 20); // Limit to top 20 groups
    } catch (error) {
        console.error("Error generating fast domain stats:", error);
        // Return empty stats on error
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

            // Convert domain entities to MongoDB filter
            const filterOptions = { timeRange };
            const mongoQuery = domainEntitiesToMongoFilter(
                entities,
                filterOptions
            );

            // Generate fast domain statistics
            const stats = await generateFastDomainStats(mongoQuery);

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
        maxAge: 5,
        staleMaxAge: 0,
        swr: true,
        base: "redis",
        getKey: (event) => {
            const domain = getRouterParam(event as any, "domain");
            const query = getQuery(event as any);
            const timeRange = query?.timeRange || "7d";
            const entityFilter = query?.entityFilter || "";

            // Create a hash of the parameters to avoid key length issues
            const keyContent = `domain:${domain}:${timeRange}:${entityFilter}:fast:v5`;
            const hash = createHash("sha256")
                .update(keyContent)
                .digest("hex")
                .substring(0, 16);

            return `domain:stats:${hash}`;
        },
    }
);
