import { createError, getQuery } from "h3";
import url from "url";
import { Killmails } from "../../../models/Killmails";

// Shared helper functions (same as other endpoints)
function hasKillTimeFilter(filter: any): boolean {
    if (!filter || typeof filter !== "object") return false;
    if (filter.kill_time) return true;
    if (filter.$and && Array.isArray(filter.$and)) {
        return filter.$and.some((condition: any) =>
            hasKillTimeFilter(condition)
        );
    }
    if (filter.$or && Array.isArray(filter.$or)) {
        return filter.$or.some((condition: any) =>
            hasKillTimeFilter(condition)
        );
    }
    return false;
}

function addDefaultTimeFilter(filter: any): any {
    if (hasKillTimeFilter(filter)) {
        return filter;
    }
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    if (!filter || Object.keys(filter).length === 0) {
        return { kill_time: { $gte: thirtyDaysAgo } };
    }
    return {
        $and: [filter, { kill_time: { $gte: thirtyDaysAgo } }],
    };
}

function determineOptimalIndexHint(
    filter: any
): Record<string, number> | undefined {
    return { kill_time: -1 };
}

function processFilterParam(parsedFilters: any): Record<string, any> {
    if (isMongoFilter(parsedFilters)) {
        return parsedFilters;
    }
    return filtersToMongoQuery(parsedFilters);
}

function isMongoFilter(obj: any): boolean {
    if (!obj || typeof obj !== "object") return false;
    const keys = Object.keys(obj);
    return keys.some(
        (key) =>
            key.startsWith("$") ||
            key.includes(".") ||
            key.includes("_id") ||
            key === "kill_time" ||
            key === "system_id" ||
            key === "region_id" ||
            key === "total_value"
    );
}

function filtersToMongoQuery(filters: any): Record<string, any> {
    const query: Record<string, any> = {};

    if (filters.timeFrom) {
        query.kill_time = query.kill_time || {};
        query.kill_time.$gte = new Date(filters.timeFrom);
    }
    if (filters.timeTo) {
        query.kill_time = query.kill_time || {};
        query.kill_time.$lte = new Date(filters.timeTo);
    }

    if (filters.locationFilter?.type && filters.locationFilter?.id) {
        const locationType = filters.locationFilter.type;
        const locationId = parseInt(filters.locationFilter.id);

        if (locationType === "system" && locationId) {
            query.system_id = locationId;
        } else if (locationType === "region" && locationId) {
            query.region_id = locationId;
        } else if (locationType === "constellation" && locationId) {
            query.constellation_id = locationId;
        }
    }

    if (filters.locationFilter?.securityTypes?.length > 0) {
        const secTypes = filters.locationFilter.securityTypes;
        const secConditions: any[] = [];

        if (secTypes.includes("highsec")) {
            secConditions.push({ security_status: { $gte: 0.5 } });
        }
        if (secTypes.includes("lowsec")) {
            secConditions.push({
                security_status: { $gte: 0.1, $lt: 0.5 },
            });
        }
        if (secTypes.includes("nullsec")) {
            secConditions.push({
                security_status: { $lte: 0.0 },
            });
        }

        if (secConditions.length > 0) {
            query.$or = secConditions;
        }
    }

    if (filters.iskMin) {
        query.total_value = query.total_value || {};
        query.total_value.$gte = parseFloat(filters.iskMin);
    }
    if (filters.iskMax) {
        query.total_value = query.total_value || {};
        query.total_value.$lte = parseFloat(filters.iskMax);
    }

    if (filters.attackerCountMin) {
        query.$expr = {
            $gte: [{ $size: "$attackers" }, parseInt(filters.attackerCountMin)],
        };
    }

    if (filters.entities && Array.isArray(filters.entities)) {
        const entityConditions: any[] = [];

        filters.entities.forEach((entity: any) => {
            const entityId = parseInt(entity.id);
            const entityCondition: any[] = [];

            if (entity.role === "victim" || entity.role === "both") {
                if (entity.type === "character") {
                    entityCondition.push({ "victim.character_id": entityId });
                } else if (entity.type === "corporation") {
                    entityCondition.push({ "victim.corporation_id": entityId });
                } else if (entity.type === "alliance") {
                    entityCondition.push({ "victim.alliance_id": entityId });
                }
            }

            if (entity.role === "attacker" || entity.role === "both") {
                if (entity.type === "character") {
                    entityCondition.push({
                        "attackers.character_id": entityId,
                    });
                } else if (entity.type === "corporation") {
                    entityCondition.push({
                        "attackers.corporation_id": entityId,
                    });
                } else if (entity.type === "alliance") {
                    entityCondition.push({ "attackers.alliance_id": entityId });
                }
            }

            if (entityCondition.length > 0) {
                entityConditions.push({ $or: entityCondition });
            }
        });

        if (entityConditions.length > 0) {
            query.$and = query.$and || [];
            query.$and.push(...entityConditions);
        }
    }

    if (
        filters.shipCategories &&
        Array.isArray(filters.shipCategories) &&
        filters.shipCategories.length > 0
    ) {
        const categoryIds = filters.shipCategories
            .map((cat: any) => parseInt(cat.id))
            .filter(Boolean);
        if (categoryIds.length > 0) {
            query.$or = query.$or || [];
            query.$or.push(
                { "victim.ship_category_id": { $in: categoryIds } },
                { "attackers.ship_category_id": { $in: categoryIds } }
            );
        }
    }

    if (
        filters.items &&
        Array.isArray(filters.items) &&
        filters.items.length > 0
    ) {
        const itemIds = filters.items
            .map((item: any) => parseInt(item.id))
            .filter(Boolean);
        if (itemIds.length > 0) {
            query["items.type_id"] = { $in: itemIds };
        }
    }

    return query;
}

export default defineCachedEventHandler(
    async (event) => {
        try {
            // Get the query parameters
            const queryParams = getQuery(event);

            // Check if filters parameter exists and is valid (support both 'filters' and 'filter')
            const filtersParam = queryParams.filters || queryParams.filter;
            if (!filtersParam || typeof filtersParam !== "string") {
                throw createError({
                    statusCode: 400,
                    statusMessage: "Filters parameter is required",
                });
            }

            // Parse the filters JSON
            let parsedFilters;
            try {
                parsedFilters = JSON.parse(filtersParam as string);
            } catch (error) {
                throw createError({
                    statusCode: 400,
                    statusMessage: "Invalid filters JSON format",
                });
            }

            // Process the filter parameter
            let mongoQuery = processFilterParam(parsedFilters);

            // Ensure we always have a kill_time filter for optimal index usage
            mongoQuery = addDefaultTimeFilter(mongoQuery);

            // Determine optimal index hint for the query
            const hint = determineOptimalIndexHint(mongoQuery);

            // Aggregate top damage dealers by character
            const pipeline: any[] = [
                { $match: mongoQuery },
                { $unwind: "$attackers" },
                {
                    $match: {
                        "attackers.character_id": { $exists: true, $ne: null },
                        "attackers.character_name": {
                            $exists: true,
                            $ne: null,
                        },
                        "attackers.damage_done": { $exists: true, $gt: 0 },
                    },
                },
                {
                    $group: {
                        _id: {
                            character_id: "$attackers.character_id",
                            character_name: "$attackers.character_name",
                        },
                        damageDone: { $sum: "$attackers.damage_done" },
                    },
                },
                { $sort: { damageDone: -1 } },
                { $limit: 10 },
                {
                    $project: {
                        _id: 0,
                        character_id: "$_id.character_id",
                        character_name: "$_id.character_name",
                        damageDone: 1,
                    },
                },
            ];

            // Apply index hint if we have one
            let aggregationQuery = Killmails.aggregate(pipeline);
            if (hint) {
                aggregationQuery = aggregationQuery.hint(hint);
            }

            const topDamageDealersByCharacter = await aggregationQuery;

            return { topDamageDealersByCharacter };
        } catch (error: any) {
            console.error("Error fetching top damage dealers:", error);

            // Forward HTTP errors
            if (error.statusCode) {
                throw error;
            }

            // Otherwise, create a generic error
            throw createError({
                statusCode: 500,
                statusMessage: "Error fetching top damage dealers",
                message: error.message || "Error fetching top damage dealers",
            });
        }
    },
    {
        maxAge: 300, // 5 minutes cache
        staleMaxAge: -1,
        swr: true,
        base: "redis",
        shouldBypassCache: (event) => {
            return process.env.NODE_ENV !== "production";
        },
        getKey: (event) => {
            const parsedUrl = url.parse(event.node.req.url || "", true);
            const query = parsedUrl.query;
            const filtersParam = query?.filters ? query.filters.toString() : "";
            return `advancedview:top:damage-dealers:${filtersParam}`;
        },
    }
);
