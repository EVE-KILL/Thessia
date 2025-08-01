import { createHash } from "crypto";

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

            // Get pagination parameters
            const page = parseInt(queryParams.page as string) || 1;
            const limit = Math.min(
                parseInt(queryParams.limit as string) || 25,
                100
            ); // Max 100 per page
            const skip = (page - 1) * limit;

            // Process the filter parameter - handle both MongoDB filters and legacy formats
            let mongoQuery = processFilterParam(parsedFilters);

            // Ensure we always have a kill_time filter for optimal index usage
            mongoQuery = addDefaultTimeFilter(mongoQuery);

            // Determine optimal index hint for the query
            const sortOptions = { kill_time: -1 };
            const hint = await determineOptimalIndexHint(
                Killmails.collection,
                mongoQuery,
                sortOptions,
                "[Killmails API]"
            );

            // Fetch killmails with pagination and index hint (with 30s timeout)
            let killmailQuery = Killmails.find(mongoQuery)
                .sort({ kill_time: -1 })
                .skip(skip)
                .limit(limit)
                .maxTimeMS(30000); // 30 second timeout

            // Apply index hint if we have one
            if (hint) {
                killmailQuery = killmailQuery.hint(hint);
            }

            const rawKillmails = await killmailQuery.lean();

            // Transform killmails to match IKillList format (same as /api/killlist)
            const killmails = rawKillmails.map((killmail: any) => {
                const finalBlowAttacker = killmail.attackers?.find(
                    (a: any) => a.final_blow
                );

                return {
                    killmail_id: killmail.killmail_id,
                    total_value: killmail.total_value,
                    system_id: killmail.system_id,
                    system_name: killmail.system_name,
                    system_security: killmail.system_security,
                    region_id: killmail.region_id,
                    region_name: killmail.region_name,
                    kill_time: killmail.kill_time,
                    attackerCount: killmail.attackers?.length || 0,
                    commentCount: 0,
                    is_npc: killmail.is_npc,
                    is_solo: killmail.is_solo,
                    victim: {
                        ship_id: killmail.victim?.ship_id,
                        ship_name: killmail.victim?.ship_name,
                        ship_group_name: killmail.victim?.ship_group_name,
                        character_id: killmail.victim?.character_id,
                        character_name: killmail.victim?.character_name,
                        corporation_id: killmail.victim?.corporation_id,
                        corporation_name: killmail.victim?.corporation_name,
                        alliance_id: killmail.victim?.alliance_id,
                        alliance_name: killmail.victim?.alliance_name,
                        faction_id: killmail.victim?.faction_id,
                        faction_name: killmail.victim?.faction_name,
                    },
                    finalblow: finalBlowAttacker
                        ? {
                              character_id: finalBlowAttacker.character_id,
                              character_name: finalBlowAttacker.character_name,
                              corporation_id: finalBlowAttacker.corporation_id,
                              corporation_name:
                                  finalBlowAttacker.corporation_name,
                              alliance_id: finalBlowAttacker.alliance_id,
                              alliance_name: finalBlowAttacker.alliance_name,
                              faction_id: finalBlowAttacker.faction_id,
                              faction_name: finalBlowAttacker.faction_name,
                              ship_group_name:
                                  finalBlowAttacker.ship_group_name,
                          }
                        : null,
                };
            });

            // Get total count for pagination (also use the hint for counting, with timeout)
            let countQuery =
                Killmails.countDocuments(mongoQuery).maxTimeMS(30000); // 30 second timeout
            if (hint) {
                countQuery = countQuery.hint(hint);
            }
            const totalKillmails = await countQuery;
            const totalPages = Math.ceil(totalKillmails / limit);

            return {
                killmails,
                pagination: {
                    currentPage: page,
                    totalPages,
                    totalKillmails,
                    limit,
                },
            };
        } catch (error: any) {
            console.error("Error fetching advanced view killmails:", error);

            // Handle timeout errors specifically
            if (error.code === 50 || error.message?.includes("MaxTimeMS")) {
                throw createError({
                    statusCode: 408,
                    statusMessage:
                        "Query timeout - please refine your search filters",
                    message:
                        "Your query took too long to execute. Please try narrowing your search criteria (shorter time range, more specific filters).",
                });
            }

            // Forward HTTP errors
            if (error.statusCode) {
                throw error;
            }

            // Otherwise, create a generic error
            throw createError({
                statusCode: 500,
                statusMessage: "Error fetching advanced view killmails",
                message:
                    error.message || "Error fetching advanced view killmails",
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
            const query = getQuery(event);
            const filtersParam = query?.filters || query?.filter || "";
            const page = query?.page || "1";
            const limit = query?.limit || "25";

            // Create a hash of the parameters to avoid key length issues
            const keyContent = `${filtersParam}:page:${page}:limit:${limit}`;
            const hash = createHash("sha256")
                .update(keyContent)
                .digest("hex")
                .substring(0, 16);

            return `av:k:${hash}`;
        },
    }
);
