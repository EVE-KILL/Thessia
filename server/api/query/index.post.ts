import crypto from "crypto";
import type { H3Event } from "h3";
import { Killmails } from "~/server/models/Killmails";
import {
    DEFAULT_EXCLUSIONS,
    DEFAULT_LIMIT,
    MAX_LIMIT,
    type QueryAPIRequest,
    VALID_FIELDS,
    VALID_OPERATORS,
} from "~/shared/helpers/queryAPIHelper";

/**
 * Query API - MongoDB-like query interface for killmail data
 *
 * Accepts complex MongoDB-style queries with filtering, sorting, and projection.
 * Example request:
 * {
 *   "filter": { "victim.alliance_id": 99003581 },
 *   "options": {
 *     "limit": 100,
 *     "skip": 0,
 *     "sort": { "kill_time": -1 },
 *     "projection": { "killmail_id": 1, "kill_time": 1 }
 *   }
 * }
 */

// List of fields that have optimized indexes in the database
// This ensures our query only uses valid indexes
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
    "victim.faction_id", // Already present, but good to confirm its intended inclusion
    "attackers.character_id",
    "attackers.corporation_id",
    "attackers.alliance_id",
    "attackers.ship_id",
    "attackers.ship_group_id", // Added for query builder
    "attackers.faction_id", // Added for query builder
    "attackers.weapon_type_id", // Added for query builder
    "items.type_id",
    "items.group_id", // Added for query builder
];

/**
 * Interface for the processed query
 */
interface ProcessedQuery {
    query: {
        filter: Record<string, any>;
        options: {
            projection: Record<string, any>;
            sort?: Record<string, 1 | -1>;
            limit?: number;
            skip?: number;
        };
    };
    pipeline: Array<Record<string, any>>;
}

/**
 * Validates if value is a positive integer
 * @param value - The value to validate
 * @param field - Field name for error messages
 * @returns The validated integer
 */
function validatePositiveInteger(value: any, field: string): number {
    const intValue = Number.parseInt(value, 10);
    if (Number.isNaN(intValue) || intValue < 0) {
        throw new Error(`${field} must be a positive integer`);
    }
    return intValue;
}

/**
 * Validates sort options
 * @param sort - Sort specification object
 * @returns Validated sort object
 */
function validateSort(sort: any): Record<string, 1 | -1> {
    if (!sort || typeof sort !== "object") {
        throw new Error("Sort must be an object");
    }

    const validatedSort: Record<string, 1 | -1> = {};
    for (const [field, direction] of Object.entries(sort)) {
        if (!VALID_FIELDS.includes(field as any)) {
            throw new Error(`Invalid sort field: ${field}`);
        }

        if (![1, -1, "asc", "desc"].includes(direction as any)) {
            throw new Error(
                `Invalid sort direction for ${field}: ${direction}. Must be 'asc', 'desc', 1, or -1`
            );
        }

        validatedSort[field] = direction === "asc" || direction === 1 ? 1 : -1;
    }

    return validatedSort;
}

/**
 * Validates skip parameter
 * @param skip - Skip value
 * @returns Validated skip value
 */
function validateSkip(skip: any): number {
    return validatePositiveInteger(skip, "skip");
}

/**
 * Validates limit parameter
 * @param limit - Limit value
 * @returns Validated limit value, capped at MAX_LIMIT
 */
function validateLimit(limit: any): number {
    const intValue = Number.parseInt(limit, 10);
    if (Number.isNaN(intValue) || intValue < 1) {
        return DEFAULT_LIMIT; // Default to default limit if invalid
    }
    return Math.min(intValue, MAX_LIMIT);
}

/**
 * Validates projection options
 * @param projection - Projection specification
 * @returns Validated projection object
 */
function validateProjection(projection: any): Record<string, 0 | 1> {
    if (!projection || typeof projection !== "object") {
        throw new Error("Projection must be an object");
    }

    const validatedProjection: Record<string, 0 | 1> = {};
    for (const [field, include] of Object.entries(projection)) {
        if (![0, 1].includes(include as any)) {
            throw new Error(
                `Invalid projection value for ${field}: must be 0 or 1`
            );
        }
        validatedProjection[field] = include as 0 | 1;
    }

    return validatedProjection;
}

/**
 * Validates filter value based on field type
 * @param key - Field key
 * @param value - Filter value
 * @returns Validated and possibly transformed filter value
 */
function validateFilterValue(key: string, value: any): any {
    // Handle the kill_time field specially
    if (key === "kill_time") {
        const validatedValue: any = {};
        for (const [operator, operand] of Object.entries(value)) {
            if (VALID_OPERATORS.includes(operator as any)) {
                if (["$gt", "$gte", "$lt", "$lte"].includes(operator)) {
                    // Convert timestamp to Date for these operators
                    validatedValue[operator] = new Date(
                        validatePositiveInteger(operand, "kill_time") * 1000
                    );
                } else if (operator === "$in" && Array.isArray(operand)) {
                    // Convert array of timestamps to array of Dates
                    validatedValue[operator] = operand.map(
                        (ts) =>
                            new Date(
                                validatePositiveInteger(ts, "kill_time") * 1000
                            )
                    );
                } else {
                    validatedValue[operator] = operand;
                }
            } else {
                throw new Error(`Invalid filter operator: ${operator}`);
            }
        }
        return validatedValue;
    }

    // Handle ID fields
    if (key.includes("_id") && !Number.isNaN(Number(value))) {
        return Number.parseInt(value, 10);
    }

    // Handle filter objects
    if (typeof value === "object" && value !== null) {
        const validatedValue: any = {};
        for (const [operator, operand] of Object.entries(value)) {
            if (VALID_OPERATORS.includes(operator as any)) {
                validatedValue[operator] = operand;
            } else {
                throw new Error(`Invalid filter operator: ${operator}`);
            }
        }
        return validatedValue;
    }

    return value;
}

/**
 * Validates filter conditions
 * @param filter - Filter object
 * @returns Validated filter object
 */
function validateFilter(filter: any): Record<string, any> {
    if (!filter || typeof filter !== "object") {
        throw new Error("Filter must be an object");
    }

    const validatedFilter: Record<string, any> = {};

    for (const [key, value] of Object.entries(filter)) {
        try {
            if (key === "$or" || key === "$and") {
                if (!Array.isArray(value)) {
                    throw new Error(
                        `Invalid ${key} operator: value must be an array`
                    );
                }
                validatedFilter[key] = value.map((condition) =>
                    validateFilter(condition)
                );
            } else if (VALID_FIELDS.includes(key as any)) {
                validatedFilter[key] = validateFilterValue(key, value);
            } else {
                throw new Error(`Invalid filter field: ${key}`);
            }
        } catch (error: any) {
            throw new Error(`Error in filter: ${error.message}`);
        }
    }

    return validatedFilter;
}

/**
 * Validates query options
 * @param options - Query options
 * @returns Validated options object
 */
function validateOptions(options: any): Record<string, any> {
    if (!options || typeof options !== "object") {
        return {};
    }

    const validatedOptions: Record<string, any> = {};

    for (const [key, value] of Object.entries(options)) {
        if (!["sort", "limit", "skip", "projection"].includes(key)) {
            throw new Error(`Invalid option: ${key}`);
        }

        switch (key) {
            case "sort":
                validatedOptions[key] = validateSort(value);
                break;
            case "limit":
                validatedOptions[key] = validateLimit(value);
                break;
            case "skip":
                validatedOptions[key] = validateSkip(value);
                break;
            case "projection":
                validatedOptions[key] = validateProjection(value);
                break;
            default:
                validatedOptions[key] = value;
        }
    }

    return validatedOptions;
}

/**
 * Validates a query request object
 * @param query - Query request to validate
 * @returns The validated query or throws an error
 */
function validateQuery(query: QueryAPIRequest): QueryAPIRequest {
    if (!query || typeof query !== "object") {
        throw new Error("Query must be an object");
    }

    return query;
}

/**
 * Extract potential index fields from a filter expression
 */
function extractFilterFields(filter: any): string[] {
    const fields: string[] = [];

    // Handle $and and $or operators
    if (filter.$and && Array.isArray(filter.$and)) {
        // For AND, any field could be a good candidate for an index
        filter.$and.forEach((condition: any) => {
            fields.push(...extractFilterFields(condition));
        });
    } else if (filter.$or && Array.isArray(filter.$or)) {
        // For OR, we ideally need indexes on all branches, but take the first one for now
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
 * This replaces the frontend hint logic with backend intelligence
 * Now that we always have a kill_time filter, we can be more aggressive with hints
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
                        [primarySortField]: sortOptions![pgirimarySortField],
                    };
                }
            }
        }
    }

    // Third priority: use filter field index if available (non-time fields)
    for (const field of filterFields) {
        if (INDEXED_FIELDS.includes(field) && field !== "kill_time") {
            // Since we always have kill_time filter now, use compound index
            if (primarySortField === "kill_time") {
                return { [field]: -1, kill_time: -1 };
            } else {
                // For other sorts, check if field only exists in compound indexes
                const compoundOnlyFields = [
                    "is_npc",
                    "is_solo",
                    "total_value",
                    "system_security",
                    "region_id",
                    "system_id",
                    "constellation_id",
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
                    "items.type_id",
                    "items.group_id",
                ];

                if (compoundOnlyFields.includes(field)) {
                    // Use compound index with kill_time since that's what exists
                    return { [field]: -1, kill_time: -1 };
                } else {
                    // Single field index exists
                    return { [field]: -1 };
                }
            }
        }
    }

    // Fourth priority: use sort field index if available
    if (primarySortField && INDEXED_FIELDS.includes(primarySortField)) {
        // Check if this is a field that only has compound indexes with kill_time
        const compoundOnlyFields = [
            "is_npc",
            "is_solo",
            "total_value",
            "system_security",
            "region_id",
            "system_id",
            "constellation_id",
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
            "items.type_id",
            "items.group_id",
        ];

        if (compoundOnlyFields.includes(primarySortField)) {
            // These fields only exist in compound indexes with kill_time
            return {
                [primarySortField]: sortOptions![primarySortField],
                kill_time: -1,
            };
        } else {
            // Single field index exists
            return { [primarySortField]: sortOptions![primarySortField] };
        }
    }

    // Since we always have kill_time filter now, default to kill_time index
    return { kill_time: -1 };
}

/**
 * Check if a filter contains any kill_time constraints
 */
function hasKillTimeFilter(filter: any): boolean {
    if (!filter || typeof filter !== "object") {
        return false;
    }

    // Direct kill_time filter
    if (filter.kill_time) {
        return true;
    }

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
 * Generates an aggregation pipeline for a complex query
 * @param input - Query input from request body
 * @returns Processed query with filter and pipeline
 */
function generateComplexQuery(input: QueryAPIRequest): ProcessedQuery {
    const query = {
        filter: {},
        options: {
            projection: { ...DEFAULT_EXCLUSIONS },
        },
    };

    // Process filter
    if (input.filter && typeof input.filter === "object") {
        try {
            query.filter = validateFilter(input.filter);
        } catch (error: any) {
            throw new Error(`Error in filter: ${error.message}`);
        }
    }

    // Add default time constraint if none exists to ensure index usage
    query.filter = addDefaultTimeFilter(query.filter);

    // Process options
    if (input.options && typeof input.options === "object") {
        const validatedOptions = validateOptions(input.options);

        // Handle projection separately
        if (validatedOptions.projection) {
            // If user specified fields to include, we switch to inclusion mode
            if (Object.values(validatedOptions.projection).includes(1)) {
                query.options.projection = { _id: 0 }; // Start with excluding _id
                for (const [field, include] of Object.entries(
                    validatedOptions.projection
                )) {
                    if (include === 1) {
                        query.options.projection[field] = 1;
                    }
                }
            } else {
                // Otherwise, we're in exclusion mode, so we merge with existing exclusions
                query.options.projection = {
                    ...query.options.projection,
                    ...validatedOptions.projection,
                };
            }
            delete validatedOptions.projection;
        }

        // Merge other options
        query.options = { ...query.options, ...validatedOptions };
    }

    // Build the pipeline - order matters for performance
    const pipeline = [];

    // Always add a $match stage, even if filter is empty
    pipeline.push({ $match: query.filter });

    // Sort before skip/limit for better index utilization
    if (query.options.sort) {
        pipeline.push({ $sort: query.options.sort });
    } else {
        pipeline.push({ $sort: { kill_time: -1 } }); // Default sort
    }

    if (query.options.skip !== undefined) {
        pipeline.push({ $skip: query.options.skip });
    }

    // Always enforce a limit to protect the database
    const limit =
        query.options.limit !== undefined ? query.options.limit : DEFAULT_LIMIT;
    pipeline.push({ $limit: Math.min(limit, MAX_LIMIT) });

    // Project at the end to reduce data transferred between pipeline stages
    if (query.options.projection) {
        pipeline.push({ $project: query.options.projection });
    }

    return {
        query,
        pipeline,
    };
}

/**
 * Main handler for query API endpoint
 */
export default defineCachedEventHandler(
    async (event: H3Event) => {
        try {
            // Parse the request body
            const body = (await readBody(event)) as QueryAPIRequest;

            if (!body || typeof body !== "object") {
                return createError({
                    statusCode: 400,
                    statusMessage: "Invalid request body: expected JSON object",
                });
            }

            // Validate the query structure
            validateQuery(body);

            // Generate the query
            const queryData = generateComplexQuery(body);

            // Use our intelligent index selection
            const hint = determineOptimalIndexHint(
                queryData.query.filter,
                queryData.query.options.sort
            );

            // Execute the aggregation pipeline with hint (we always have one now due to automatic time filter)
            const result = await Killmails.aggregate(queryData.pipeline)
                .hint(hint)
                .exec();

            // Return the results
            return result;
        } catch (error: any) {
            console.error("Query API error:", error.message);

            // Provide user-friendly error messages
            return createError({
                statusCode:
                    error.message.includes("Invalid") ||
                    error.message.includes("Error in filter")
                        ? 400
                        : 500,
                statusMessage: error.message,
            });
        }
    },
    {
        maxAge: 300,
        name: "queryAPI",
        getKey: async (event) => {
            const body = (await readBody(event)) as QueryAPIRequest;
            // generate a hash of the body to use as a cache key
            const hash = crypto.createHash("sha256");
            hash.update(JSON.stringify(body));
            return hash.digest("hex");
        },
    }
);
