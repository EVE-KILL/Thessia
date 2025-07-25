import { createError, getQuery, setHeaders } from "h3";
import type { H3Event } from "h3";
import { Killmails } from "../../models/Killmails";
import { InvGroups } from "../../models/InvGroups";

// List of fields that have optimized indexes in the database
const INDEXED_FIELDS = [
    "killmail_id",
    "killmail_hash",
    "kill_time",
    "is_npc",
    "is_solo",
    "region_id",
    "system_id",
    "system_security",
    "constellation_id",
    "total_value",
    "victim.character_id",
    "victim.corporation_id",
    "victim.alliance_id",
    "victim.ship_id",
    "victim.ship_group_id",
    "victim.faction_id",
    "victim.damage_taken",
    "attackers.character_id",
    "attackers.corporation_id",
    "attackers.alliance_id",
    "attackers.ship_id",
    "attackers.ship_group_id",
    "attackers.faction_id",
    "attackers.weapon_type_id",
    "items.type_id",
    "items.group_id",
];

// Cache for ship group IDs from category 6
let shipGroupIds: number[] | null = null;

/**
 * Get ship group IDs for category 6 (Ships) that are published
 */
async function getShipGroupIds(): Promise<number[]> {
    if (shipGroupIds === null) {
        try {
            const groups = await InvGroups.find(
                {
                    category_id: 6,
                    published: true,
                },
                { group_id: 1 }
            ).lean();

            shipGroupIds = groups.map((group: any) => group.group_id);
        } catch (error) {
            console.error("Error fetching ship group IDs:", error);
            shipGroupIds = [];
        }
    }
    return shipGroupIds;
}

/**
 * Check if a filter contains any kill_time constraints
 */
function hasKillTimeFilter(filter: any): boolean {
    if (!filter || typeof filter !== "object") return false;

    // Direct kill_time filter
    if (filter.kill_time) return true;

    // Check $and conditions
    if (filter.$and && Array.isArray(filter.$and)) {
        return filter.$and.some((condition: any) =>
            hasKillTimeFilter(condition)
        );
    }

    // Check $or conditions
    if (filter.$or && Array.isArray(filter.$or)) {
        return filter.$or.some((condition: any) =>
            hasKillTimeFilter(condition)
        );
    }

    return false;
}

/**
 * Adds a default kill_time filter to limit results to last 30 days if no time constraint exists
 */
function addDefaultTimeFilter(filter: any): any {
    if (hasKillTimeFilter(filter)) {
        return filter; // Already has time constraint, don't modify
    }

    // Calculate 30 days ago
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    // If filter is empty, just add kill_time constraint
    if (!filter || Object.keys(filter).length === 0) {
        return { kill_time: { $gte: thirtyDaysAgo } };
    }

    // If filter exists but no time constraint, add it with $and
    return {
        $and: [filter, { kill_time: { $gte: thirtyDaysAgo } }],
    };
}

/**
 * Extract filter fields for index optimization
 */
function extractFilterFields(filter: any): string[] {
    const fields: string[] = [];

    // Handle $and and $or operators
    if (filter.$and && Array.isArray(filter.$and)) {
        filter.$and.forEach((condition: any) => {
            fields.push(...extractFilterFields(condition));
        });
    } else if (filter.$or && Array.isArray(filter.$or)) {
        if (filter.$or.length > 0) {
            fields.push(...extractFilterFields(filter.$or[0]));
        }
    } else {
        // For regular filters, add any non-operator keys
        Object.keys(filter).forEach((key) => {
            if (!key.startsWith("$")) {
                fields.push(key);
            }
        });
    }

    return fields;
}

/**
 * Determines the best index to use for a query based on filter and sort
 */
function determineOptimalIndexHint(
    filter: any,
    sortOptions?: Record<string, any>
): Record<string, number> | undefined {
    // Extract the primary sort field if provided
    let primarySortField: string | undefined;
    if (sortOptions && Object.keys(sortOptions).length > 0) {
        primarySortField = Object.keys(sortOptions)[0];
    }

    // Get filter fields to check for optimal compound indexes
    const filterFields = extractFilterFields(filter);

    // First priority: exact match between filter field and sort field
    if (primarySortField) {
        for (const field of filterFields) {
            if (INDEXED_FIELDS.includes(field) && field === primarySortField) {
                return { [field]: -1 };
            }
        }
    }

    // Second priority: compound index with filter field + sort field
    if (primarySortField && INDEXED_FIELDS.includes(primarySortField)) {
        for (const field of filterFields) {
            if (INDEXED_FIELDS.includes(field) && field !== "kill_time") {
                // Use compound index with the filter field first, then sort field
                if (primarySortField === "kill_time") {
                    return { [field]: -1, kill_time: -1 };
                } else {
                    // For non-time sorts, try compound with filter + sort
                    return {
                        [field]: -1,
                        [primarySortField]: sortOptions![primarySortField],
                    };
                }
            }
        }
    }

    // Since we always have kill_time filter now, default to kill_time index
    return { kill_time: -1 };
}

/**
 * Handle filter parameter - either a MongoDB filter object or advanced search filters
 */
function processFilterParam(parsedFilters: any): Record<string, any> {
    // If it's already a MongoDB filter object (from advanced search or query API),
    // use it directly as it contains all the necessary filter conditions
    if (isMongoFilter(parsedFilters)) {
        return parsedFilters;
    }

    // Otherwise, convert legacy filter format to MongoDB query
    return filtersToMongoQuery(parsedFilters);
}

/**
 * Check if the object looks like a MongoDB filter
 */
function isMongoFilter(obj: any): boolean {
    if (!obj || typeof obj !== "object") return false;

    // Check for MongoDB operators or field names that indicate it's a direct filter
    const keys = Object.keys(obj);
    return keys.some(
        (key) =>
            key.startsWith("$") || // MongoDB operators like $and, $or, $in, etc.
            key.includes(".") || // Nested field paths like 'victim.character_id'
            key.includes("_id") || // Database field names
            key === "kill_time" ||
            key === "system_id" ||
            key === "region_id" ||
            key === "total_value"
    );
}

/**
 * Convert legacy advanced search filters to MongoDB query
 * This handles older filter formats that aren't direct MongoDB filters
 */
function filtersToMongoQuery(filters: any): Record<string, any> {
    const query: Record<string, any> = {};

    // Time range filters
    if (filters.timeFrom) {
        query.kill_time = query.kill_time || {};
        query.kill_time.$gte = new Date(filters.timeFrom);
    }
    if (filters.timeTo) {
        query.kill_time = query.kill_time || {};
        query.kill_time.$lte = new Date(filters.timeTo);
    }

    // Location filters
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

    // Security filters
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

    // ISK value filters
    if (filters.iskMin) {
        query.total_value = query.total_value || {};
        query.total_value.$gte = parseFloat(filters.iskMin);
    }
    if (filters.iskMax) {
        query.total_value = query.total_value || {};
        query.total_value.$lte = parseFloat(filters.iskMax);
    }

    // Attacker count filters
    if (filters.attackerCountMin) {
        query.$expr = {
            $gte: [{ $size: "$attackers" }, parseInt(filters.attackerCountMin)],
        };
    }

    // Entity filters
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

    // Ship category filters
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

    // Items filter
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

export default defineEventHandler(async (event: H3Event) => {
    try {
        // Set cache headers for 10 minutes
        setHeaders(event, {
            "Cache-Control": "public, max-age=600, stale-while-revalidate=1200",
            Vary: "Accept-Encoding",
        });

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

        // Process the filter parameter - handle both MongoDB filters and legacy formats
        let mongoQuery = processFilterParam(parsedFilters);

        // Ensure we always have a kill_time filter for optimal index usage
        mongoQuery = addDefaultTimeFilter(mongoQuery);

        // Get ship group IDs for category 6 (Ships)
        const validShipGroupIds = await getShipGroupIds();

        // Determine optimal index hint for the query
        const hint = determineOptimalIndexHint(mongoQuery);

        // Aggregate ship statistics with category 6 filter
        const pipeline = [
            { $match: mongoQuery },
            {
                $facet: {
                    victimShips: [
                        {
                            $match: {
                                "victim.ship_group_id": {
                                    $in: validShipGroupIds,
                                },
                            },
                        },
                        {
                            $group: {
                                _id: {
                                    ship_group_id: "$victim.ship_group_id",
                                    ship_group_name: "$victim.ship_group_name",
                                },
                                lost: { $sum: 1 },
                            },
                        },
                    ],
                    attackerShips: [
                        {
                            $unwind: "$attackers",
                        },
                        {
                            $match: {
                                "attackers.ship_group_id": {
                                    $in: validShipGroupIds,
                                },
                            },
                        },
                        {
                            $group: {
                                _id: {
                                    ship_group_id: "$attackers.ship_group_id",
                                    ship_group_name:
                                        "$attackers.ship_group_name",
                                },
                                killed: { $sum: 1 },
                            },
                        },
                    ],
                },
            },
        ];

        // Apply index hint if we have one
        let aggregationQuery = Killmails.aggregate(pipeline);
        if (hint) {
            aggregationQuery = aggregationQuery.hint(hint);
        }

        const result = await aggregationQuery;
        const { victimShips, attackerShips } = result[0];

        // Combine victim and attacker ship stats
        const shipStatsMap = new Map();

        // Add victim ships (lost)
        victimShips.forEach((ship: any) => {
            const key = ship._id.ship_group_id;
            if (!shipStatsMap.has(key)) {
                shipStatsMap.set(key, {
                    ship_group_id: ship._id.ship_group_id,
                    ship_group_name: ship._id.ship_group_name,
                    killed: 0,
                    lost: 0,
                });
            }
            shipStatsMap.get(key).lost = ship.lost;
        });

        // Add attacker ships (killed)
        attackerShips.forEach((ship: any) => {
            const key = ship._id.ship_group_id;
            if (!shipStatsMap.has(key)) {
                shipStatsMap.set(key, {
                    ship_group_id: ship._id.ship_group_id,
                    ship_group_name: ship._id.ship_group_name,
                    killed: 0,
                    lost: 0,
                });
            }
            shipStatsMap.get(key).killed = ship.killed;
        });

        // Convert map to array and sort by total activity
        const shipGroupStats = Array.from(shipStatsMap.values()).sort(
            (a, b) => {
                const totalA = a.killed + a.lost;
                const totalB = b.killed + b.lost;
                return totalB - totalA;
            }
        );

        return { shipGroupStats };
    } catch (error: any) {
        console.error("Error fetching ship statistics:", error);

        // Forward HTTP errors
        if (error.statusCode) {
            throw error;
        }

        // Otherwise, create a generic error
        throw createError({
            statusCode: 500,
            statusMessage: "Error fetching ship statistics",
            message: error.message || "Error fetching ship statistics",
        });
    }
});
