import { createHash } from "crypto";

/**
 * Convert domain entities to MongoDB filter
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
        if (options.entityMatchMode === "all") {
            query.$and = entityConditions;
        } else {
            // Default to "any" - match any of the entities
            query.$or = entityConditions;
        }
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

export default defineCachedEventHandler(
    async (event) => {
        try {
            const domain = getRouterParam(event, "domain");
            if (!domain) {
                throw createError({
                    statusCode: 400,
                    statusMessage: "Domain parameter is required",
                });
            }

            // Get query parameters
            const query = getQuery(event);
            const timeRange = (query.timeRange as string) || "7d";
            const entityFilter = query.entityFilter as string; // Optional: filter to specific entity
            const page = parseInt((query.page as string) || "1");
            const limit = Math.min(
                parseInt((query.limit as string) || "50"),
                100
            ); // Max 100 per page
            const sortField = (query.sort as string) || "kill_time";
            const sortOrder = (query.order as string) || "desc";

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
            const filterOptions = { timeRange, entityMatchMode: "any" };
            const mongoQuery = domainEntitiesToMongoFilter(
                entities,
                filterOptions
            );

            // Calculate skip for pagination
            const skip = (page - 1) * limit;

            // Build sort object
            const sortObj: any = {};
            sortObj[sortField] = sortOrder === "asc" ? 1 : -1;

            // Use aggregation pipeline like the regular killlist API for consistent formatting
            let pipeline: any[] = [
                { $match: mongoQuery },
                { $sort: sortObj },
                { $skip: skip },
                { $limit: limit },
                {
                    $addFields: {
                        finalBlowAttacker: {
                            $arrayElemAt: [
                                {
                                    $filter: {
                                        input: "$attackers",
                                        as: "attacker",
                                        cond: {
                                            $eq: [
                                                "$$attacker.final_blow",
                                                true,
                                            ],
                                        },
                                    },
                                },
                                0,
                            ],
                        },
                        attackerCount: { $size: "$attackers" },
                    },
                },
                {
                    $project: {
                        killmail_id: 1,
                        total_value: 1,
                        system_id: 1,
                        system_name: 1,
                        system_security: 1,
                        region_id: 1,
                        region_name: 1,
                        kill_time: 1,
                        attackerCount: 1,
                        is_npc: 1,
                        is_solo: 1,
                        commentCount: { $literal: 0 },
                        victim: {
                            ship_id: "$victim.ship_id",
                            ship_name: "$victim.ship_name",
                            ship_group_name: "$victim.ship_group_name",
                            character_id: "$victim.character_id",
                            character_name: "$victim.character_name",
                            corporation_id: "$victim.corporation_id",
                            corporation_name: "$victim.corporation_name",
                            corporation_ticker: "$victim.corporation_ticker",
                            alliance_id: "$victim.alliance_id",
                            alliance_name: "$victim.alliance_name",
                            alliance_ticker: "$victim.alliance_ticker",
                            faction_id: "$victim.faction_id",
                            faction_name: "$victim.faction_name",
                        },
                        finalblow: {
                            character_id: "$finalBlowAttacker.character_id",
                            character_name: "$finalBlowAttacker.character_name",
                            corporation_id: "$finalBlowAttacker.corporation_id",
                            corporation_name:
                                "$finalBlowAttacker.corporation_name",
                            corporation_ticker:
                                "$finalBlowAttacker.corporation_ticker",
                            alliance_id: "$finalBlowAttacker.alliance_id",
                            alliance_name: "$finalBlowAttacker.alliance_name",
                            alliance_ticker:
                                "$finalBlowAttacker.alliance_ticker",
                            faction_id: "$finalBlowAttacker.faction_id",
                            faction_name: "$finalBlowAttacker.faction_name",
                            ship_group_name:
                                "$finalBlowAttacker.ship_group_name",
                        },
                    },
                },
            ];

            // Execute aggregation pipeline and return killmails array directly (like regular killlist API)
            const result = await Killmails.aggregate(pipeline);
            return result;
        } catch (error: any) {
            console.error("Error fetching domain killmails:", error);

            // Forward HTTP errors
            if (error.statusCode) {
                throw error;
            }

            // Otherwise, create a generic error
            throw createError({
                statusCode: 500,
                statusMessage: "Error fetching domain killmails",
                message: error.message || "Error fetching domain killmails",
            });
        }
    },
    {
        maxAge: 300, // 5 minutes cache for killmails
        staleMaxAge: -1,
        swr: true,
        base: "redis",
        getKey: (event) => {
            const domain = getRouterParam(event, "domain");
            const query = getQuery(event);
            const timeRange = query?.timeRange || "7d";
            const entityFilter = query?.entityFilter || "";
            const page = query?.page || "1";
            const limit = query?.limit || "50";
            const sort = query?.sort || "kill_time";
            const order = query?.order || "desc";

            // Create a hash of the parameters to avoid key length issues
            // Add version suffix to bust old cache
            const keyContent = `domain:${domain}:${timeRange}:${entityFilter}:${page}:${limit}:${sort}:${order}:v2`;
            const hash = createHash("sha256")
                .update(keyContent)
                .digest("hex")
                .substring(0, 16);

            return `domain:killmails:${hash}`;
        },
    }
);
