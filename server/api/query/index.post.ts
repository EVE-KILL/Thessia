import type { H3Event } from "h3";
import { Killmails } from "~/server/models/Killmails";

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

// Define valid filters, fields, and options
const VALID_FILTERS = [
  "$gt",
  "$gte",
  "$lt",
  "$lte",
  "$eq",
  "$ne",
  "$in",
  "$nin",
  "$exists",
  "$or",
  "$and",
];
const VALID_FIELDS = [
  "killmail_id",
  "killmail_hash",
  "dna",
  "is_npc",
  "is_solo",
  "region_id",
  "system_id",
  "system_security",
  "constellation_id",
  "total_value",
  "war_id",
  "kill_time",
  "victim.ship_id",
  "victim.ship_group_id",
  "victim.character_id",
  "victim.corporation_id",
  "victim.alliance_id",
  "victim.faction_id",
  "attackers.ship_id",
  "attackers.ship_group_id",
  "attackers.character_id",
  "attackers.corporation_id",
  "attackers.alliance_id",
  "attackers.faction_id",
  "attackers.weapon_type_id",
  "items.type_id",
  "items.group_id",
];
const VALID_OPTIONS = ["sort", "limit", "skip", "projection"];
const MAX_LIMIT = 10000;
const DEFAULT_LIMIT = 100;

// Fields to exclude by default from query results
const DEFAULT_EXCLUSIONS = {
  _id: 0,
  __v: 0,
  createdAt: 0,
  updatedAt: 0,
  kill_time_str: 0,
};

/**
 * Interface for query request body
 */
interface QueryRequestBody {
  filter?: Record<string, any>;
  options?: {
    sort?: Record<string, any>;
    limit?: number;
    skip?: number;
    projection?: Record<string, 0 | 1>;
  };
}

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
    if (!VALID_FIELDS.includes(field)) {
      throw new Error(`Invalid sort field: ${field}`);
    }

    if (![1, -1, "asc", "desc"].includes(direction as any)) {
      throw new Error(
        `Invalid sort direction for ${field}: ${direction}. Must be 'asc', 'desc', 1, or -1`,
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
    return DEFAULT_LIMIT; // Default to 100 if invalid
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
      throw new Error(`Invalid projection value for ${field}: must be 0 or 1`);
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
      if (VALID_FILTERS.includes(operator)) {
        if (["$gt", "$gte", "$lt", "$lte"].includes(operator)) {
          // Convert timestamp to Date for these operators
          validatedValue[operator] = new Date(validatePositiveInteger(operand, "kill_time") * 1000);
        } else if (operator === "$in" && Array.isArray(operand)) {
          // Convert array of timestamps to array of Dates
          validatedValue[operator] = operand.map(
            (ts) => new Date(validatePositiveInteger(ts, "kill_time") * 1000),
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
      if (VALID_FILTERS.includes(operator)) {
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
          throw new Error(`Invalid ${key} operator: value must be an array`);
        }
        validatedFilter[key] = value.map((condition) => validateFilter(condition));
      } else if (VALID_FIELDS.includes(key)) {
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
    if (!VALID_OPTIONS.includes(key)) {
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
 * Generates an aggregation pipeline for a complex query
 * @param input - Query input from request body
 * @returns Processed query with filter and pipeline
 */
function generateComplexQuery(input: QueryRequestBody): ProcessedQuery {
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

  // Process options
  if (input.options && typeof input.options === "object") {
    const validatedOptions = validateOptions(input.options);

    // Handle projection separately
    if (validatedOptions.projection) {
      // If user specified fields to include, we switch to inclusion mode
      if (Object.values(validatedOptions.projection).includes(1)) {
        query.options.projection = { _id: 0 }; // Start with excluding _id
        for (const [field, include] of Object.entries(validatedOptions.projection)) {
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
  const limit = query.options.limit !== undefined ? query.options.limit : DEFAULT_LIMIT;
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
export default defineEventHandler(async (event: H3Event) => {
  try {
    // Parse the request body
    const body = (await readBody(event)) as QueryRequestBody;

    if (!body || typeof body !== "object") {
      return createError({
        statusCode: 400,
        statusMessage: "Invalid request body: expected JSON object",
      });
    }

    // Generate the query
    const queryData = generateComplexQuery(body);

    // Get a hint based on the first filter field to help the query optimizer
    let hint: Record<string, number> | undefined = undefined;
    const filterFields = Object.keys(queryData.query.filter);
    if (filterFields.length > 0) {
      const primaryField = filterFields[0];
      if (primaryField !== "$or" && primaryField !== "$and") {
        hint = { [primaryField]: -1, kill_time: -1 };
      }
    } else {
      hint = { kill_time: -1 }; // Default index hint for empty filters
    }

    // Execute the aggregation pipeline with optimal hint
    const result = hint
      ? await Killmails.aggregate(queryData.pipeline).hint(hint).exec()
      : await Killmails.aggregate(queryData.pipeline).exec();

    // Return the results
    return result;
  } catch (error: any) {
    console.error("Query API error:", error.message);

    // Provide user-friendly error messages
    return createError({
      statusCode:
        error.message.includes("Invalid") || error.message.includes("Error in filter") ? 400 : 500,
      statusMessage: error.message,
    });
  }
});
