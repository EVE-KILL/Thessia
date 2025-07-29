import { createError, getQuery } from "h3";
import url from "url";
import { generateAdvancedViewStats } from "../../helpers/AdvancedViewHelper";

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
 * Adds a default kill_time filter to limit results to last 7 days if no time constraint exists
 */
function addDefaultTimeFilter(filter: any): any {
    if (hasKillTimeFilter(filter)) {
        return filter; // Already has time constraint, don't modify
    }

    // Calculate 7 days ago to match frontpage default
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    // If filter is empty, just add kill_time constraint
    if (!filter || Object.keys(filter).length === 0) {
        return { kill_time: { $gte: sevenDaysAgo } };
    }

    // If filter exists but no time constraint, merge the time constraint directly
    // This avoids unnecessary $and wrapping for simple filters
    const mergedFilter = { ...filter };
    mergedFilter.kill_time = { $gte: sevenDaysAgo };

    return mergedFilter;
}

/**
 * Handle filter parameter - either a MongoDB filter object or advanced search filters
 */
function processFilterParam(parsedFilters: any): Record<string, any> {
    // If it's already a MongoDB filter object (from advanced search or query API),
    // normalize the data types and use it directly
    if (isMongoFilter(parsedFilters)) {
        return normalizeMongoFilterTypes(parsedFilters);
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
 * Normalize data types in MongoDB filters to ensure proper querying
 * This handles cases where JSON parsing from URL parameters results in string values
 * when numeric values are expected for database fields
 */
function normalizeMongoFilterTypes(filter: any): any {
    if (!filter || typeof filter !== "object") {
        return filter;
    }

    // Handle arrays (for $and, $or, $in, etc.)
    if (Array.isArray(filter)) {
        return filter.map((item) => normalizeMongoFilterTypes(item));
    }

    const normalized: any = {};

    for (const [key, value] of Object.entries(filter)) {
        // Fields that should be converted to numbers
        const numericFields = [
            "victim.character_id",
            "victim.corporation_id",
            "victim.alliance_id",
            "victim.ship_id",
            "victim.ship_group_id",
            "victim.faction_id",
            "attackers.character_id",
            "attackers.corporation_id",
            "attackers.alliance_id",
            "attackers.ship_id",
            "attackers.ship_group_id",
            "attackers.faction_id",
            "attackers.weapon_type_id",
            "character_id",
            "corporation_id",
            "alliance_id",
            "ship_id",
            "ship_group_id",
            "faction_id",
            "killmail_id",
            "system_id",
            "region_id",
            "constellation_id",
            "total_value",
            "items.type_id",
            "items.group_id",
        ];

        if (numericFields.includes(key)) {
            // Convert string numbers to actual numbers for ID fields
            if (typeof value === "string" && /^\d+$/.test(value)) {
                normalized[key] = parseInt(value, 10);
            } else if (typeof value === "object" && value !== null) {
                // Handle operators like {$in: ["123", "456"]} or {$gte: "100"}
                if (Array.isArray(value)) {
                    // Handle arrays directly (e.g., for field: ["123", "456"])
                    normalized[key] = value.map((item) =>
                        typeof item === "string" && /^\d+$/.test(item)
                            ? parseInt(item, 10)
                            : item
                    );
                } else {
                    // Handle objects with operators recursively, but special case for $in arrays
                    const normalizedValue: any = {};
                    for (const [opKey, opValue] of Object.entries(value)) {
                        if (opKey === "$in" && Array.isArray(opValue)) {
                            normalizedValue[opKey] = opValue.map((item) =>
                                typeof item === "string" && /^\d+$/.test(item)
                                    ? parseInt(item, 10)
                                    : item
                            );
                        } else if (
                            typeof opValue === "string" &&
                            /^\d+$/.test(opValue)
                        ) {
                            normalizedValue[opKey] = parseInt(opValue, 10);
                        } else {
                            normalizedValue[opKey] =
                                normalizeMongoFilterTypes(opValue);
                        }
                    }
                    normalized[key] = normalizedValue;
                }
            } else {
                normalized[key] = value;
            }
        } else if (key.startsWith("$")) {
            // Handle MongoDB operators recursively
            normalized[key] = normalizeMongoFilterTypes(value);
        } else if (typeof value === "object" && value !== null) {
            // Recursively process nested objects
            normalized[key] = normalizeMongoFilterTypes(value);
        } else {
            normalized[key] = value;
        }
    }

    return normalized;
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

    // Ship group filters (ship_category_id doesn't exist in killmail structure)
    if (
        filters.shipGroups &&
        Array.isArray(filters.shipGroups) &&
        filters.shipGroups.length > 0
    ) {
        const groupIds = filters.shipGroups
            .map((group: any) => parseInt(group.id))
            .filter(Boolean);
        if (groupIds.length > 0) {
            query.$or = query.$or || [];
            query.$or.push(
                { "victim.ship_group_id": { $in: groupIds } },
                { "attackers.ship_group_id": { $in: groupIds } }
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

export default defineCachedEventHandler(
    async (event) => {
        try {
            // Get the query parameters
            const query = getQuery(event);

            // Check if filters parameter exists and is valid (support both 'filters' and 'filter')
            const filtersParam = query.filters || query.filter;
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

            // Generate the advanced view statistics
            const stats = await generateAdvancedViewStats(mongoQuery);

            return stats;
        } catch (error: any) {
            console.error("Error generating advanced view stats:", error);

            // Forward HTTP errors
            if (error.statusCode) {
                throw error;
            }

            // Otherwise, create a generic error
            throw createError({
                statusCode: 500,
                statusMessage: "Error generating advanced view statistics",
                message:
                    error.message ||
                    "Error generating advanced view statistics",
            });
        }
    },
    {
        maxAge: 3600, // 1 hour cache
        staleMaxAge: -1,
        swr: true,
        base: "redis",
        shouldBypassCache: (event) => {
            return process.env.NODE_ENV !== "production";
        },
        getKey: (event) => {
            const parsedUrl = url.parse(event.node.req.url || "", true);
            const query = parsedUrl.query;
            const filtersParam = query?.filters || query?.filter || "";
            return `advancedview:stats:${filtersParam}`;
        },
    }
);
