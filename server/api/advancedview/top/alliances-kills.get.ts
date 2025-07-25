import { createError, getQuery } from "h3";
import url from "url";
import { Killmails } from "../../../models/Killmails";

// Shared helper functions (condensed version)
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
    if (hasKillTimeFilter(filter)) return filter;
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    if (!filter || Object.keys(filter).length === 0) {
        return { kill_time: { $gte: thirtyDaysAgo } };
    }
    return { $and: [filter, { kill_time: { $gte: thirtyDaysAgo } }] };
}

function processFilterParam(parsedFilters: any): Record<string, any> {
    if (isMongoFilter(parsedFilters)) return parsedFilters;
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

    if (filters.iskMin) {
        query.total_value = query.total_value || {};
        query.total_value.$gte = parseFloat(filters.iskMin);
    }
    if (filters.iskMax) {
        query.total_value = query.total_value || {};
        query.total_value.$lte = parseFloat(filters.iskMax);
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
            } // Parse the filters JSON
            let parsedFilters;
            try {
                parsedFilters = JSON.parse(filtersParam as string);
            } catch (error) {
                throw createError({
                    statusCode: 400,
                    statusMessage: "Invalid filters JSON format",
                });
            }

            // Process the filter parameter - handle both MongoDB filters and legacy formats
            let mongoQuery = processFilterParam(parsedFilters);

            // Ensure we always have a kill_time filter for optimal index usage
            mongoQuery = addDefaultTimeFilter(mongoQuery);

            // Aggregate top alliances by kills
            const pipeline: any[] = [
                { $match: mongoQuery },
                { $unwind: "$attackers" },
                {
                    $match: {
                        "attackers.alliance_id": { $exists: true, $ne: null },
                        "attackers.alliance_name": { $exists: true, $ne: null },
                    },
                },
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
                        _id: 0,
                        alliance_id: "$_id.alliance_id",
                        alliance_name: "$_id.alliance_name",
                        kills: 1,
                    },
                },
            ];

            const topKillersByAlliance = await Killmails.aggregate(
                pipeline
            ).hint({ kill_time: -1 });

            return { topKillersByAlliance };
        } catch (error: any) {
            console.error("Error fetching top alliances (kills):", error);

            // Forward HTTP errors
            if (error.statusCode) {
                throw error;
            }

            // Otherwise, create a generic error
            throw createError({
                statusCode: 500,
                statusMessage: "Error fetching top alliances (kills)",
                message:
                    error.message || "Error fetching top alliances (kills)",
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
            return `advancedview:top:alliances-kills:${filtersParam}`;
        },
    }
);
