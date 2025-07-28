import crypto from "crypto";
import type { H3Event } from "h3";
import { Killmails } from "~/server/models/Killmails";
import {
    addDefaultTimeFilter,
    determineOptimalIndexHint,
} from "~/server/utils/indexOptimizer";
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
                    // Handle both Unix timestamps (numbers) and ISO strings
                    let dateValue: Date;
                    if (typeof operand === "string") {
                        // ISO string format from frontend
                        dateValue = new Date(operand);
                        if (isNaN(dateValue.getTime())) {
                            throw new Error(
                                `Invalid date format for kill_time: ${operand}`
                            );
                        }
                    } else if (typeof operand === "number") {
                        // Unix timestamp (seconds)
                        dateValue = new Date(
                            validatePositiveInteger(operand, "kill_time") * 1000
                        );
                    } else {
                        throw new Error(
                            `Invalid kill_time value type: expected string or number, got ${typeof operand}`
                        );
                    }
                    validatedValue[operator] = dateValue;
                } else if (operator === "$in" && Array.isArray(operand)) {
                    // Convert array of timestamps/ISO strings to array of Dates
                    validatedValue[operator] = operand.map((item) => {
                        if (typeof item === "string") {
                            const dateValue = new Date(item);
                            if (isNaN(dateValue.getTime())) {
                                throw new Error(
                                    `Invalid date format in kill_time array: ${item}`
                                );
                            }
                            return dateValue;
                        } else if (typeof item === "number") {
                            return new Date(
                                validatePositiveInteger(item, "kill_time") *
                                    1000
                            );
                        } else {
                            throw new Error(
                                `Invalid kill_time array item type: expected string or number, got ${typeof item}`
                            );
                        }
                    });
                } else {
                    validatedValue[operator] = operand;
                }
            } else {
                throw new Error(`Invalid filter operator: ${operator}`);
            }
        }
        return validatedValue;
    }

    // Handle ID fields with comprehensive normalization
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
            return parseInt(value, 10);
        } else if (typeof value === "object" && value !== null) {
            // Handle operators like {$in: ["123", "456"]} or {$gte: "100"}
            const validatedValue: any = {};
            for (const [operator, operand] of Object.entries(value)) {
                if (VALID_OPERATORS.includes(operator as any)) {
                    if (operator === "$in" && Array.isArray(operand)) {
                        validatedValue[operator] = operand.map((item) =>
                            typeof item === "string" && /^\d+$/.test(item)
                                ? parseInt(item, 10)
                                : item
                        );
                    } else if (
                        typeof operand === "string" &&
                        /^\d+$/.test(operand)
                    ) {
                        validatedValue[operator] = parseInt(operand, 10);
                    } else {
                        validatedValue[operator] = operand;
                    }
                } else {
                    throw new Error(`Invalid filter operator: ${operator}`);
                }
            }
            return validatedValue;
        }
        return value;
    }

    // Handle legacy ID fields (for backward compatibility)
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
 * Generates an aggregation pipeline for a complex query
 * @param input - Query input from request body
 * @returns Processed query with filter and pipeline
 */
function generateComplexQuery(input: QueryAPIRequest): ProcessedQuery {
    const query = {
        filter: {},
        options: {
            projection: { ...DEFAULT_EXCLUSIONS },
            sort: undefined as Record<string, 1 | -1> | undefined,
            limit: undefined as number | undefined,
            skip: undefined as number | undefined,
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

        // Merge other options properly
        if (validatedOptions.sort) {
            query.options.sort = validatedOptions.sort;
        }
        if (validatedOptions.limit !== undefined) {
            query.options.limit = validatedOptions.limit;
        }
        if (validatedOptions.skip !== undefined) {
            query.options.skip = validatedOptions.skip;
        }
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
            const hint = await determineOptimalIndexHint(
                Killmails.collection,
                queryData.query.filter,
                queryData.query.options.sort,
                "[Query API]"
            );

            // Execute the aggregation pipeline with hint (we always have one now due to automatic time filter)
            let aggregation = Killmails.aggregate(queryData.pipeline);

            // Only apply hint if we have one and it makes sense
            if (hint) {
                aggregation = aggregation.hint(hint);
            }

            const result = await aggregation.exec();

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
