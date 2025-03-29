/**
 * MongoDB operators supported by the Query API
 */
export type MongoOperator =
  | "$gt"
  | "$gte"
  | "$lt"
  | "$lte"
  | "$eq"
  | "$ne"
  | "$in"
  | "$nin"
  | "$exists"
  | "$or"
  | "$and";

/**
 * All fields that can be queried in the API
 */
export type QueryableField =
  | "killmail_id"
  | "killmail_hash"
  | "dna"
  | "is_npc"
  | "is_solo"
  | "region_id"
  | "system_id"
  | "system_security"
  | "constellation_id"
  | "total_value"
  | "war_id"
  | "kill_time"
  | "victim.ship_id"
  | "victim.ship_group_id"
  | "victim.character_id"
  | "victim.corporation_id"
  | "victim.alliance_id"
  | "victim.faction_id"
  | "attackers.ship_id"
  | "attackers.ship_group_id"
  | "attackers.character_id"
  | "attackers.corporation_id"
  | "attackers.alliance_id"
  | "attackers.faction_id"
  | "attackers.weapon_type_id"
  | "items.type_id"
  | "items.group_id";

/**
 * Simple primitive values for filters
 */
export type SimpleFilterValue = string | number | boolean | null;

/**
 * Filter values that use MongoDB operators
 */
export type OperatorFilterValue = {
  [K in MongoOperator]?: K extends "$or" | "$and"
    ? FilterCondition[]
    : K extends "$in" | "$nin"
      ? SimpleFilterValue[]
      : SimpleFilterValue;
};

/**
 * Valid filter values
 */
export type FilterValue = SimpleFilterValue | OperatorFilterValue;

/**
 * Filter conditions for query fields
 */
export type FilterCondition =
  | {
      [field in QueryableField]?: FilterValue;
    }
  | {
      $or?: FilterCondition[];
      $and?: FilterCondition[];
    };

/**
 * Valid sort directions
 */
export type SortDirection = 1 | -1 | "asc" | "desc";

/**
 * Options for sorting results
 */
export type SortOptions = {
  [field in QueryableField]?: SortDirection;
};

/**
 * Values for field projection (include/exclude)
 */
export type ProjectionValue = 0 | 1;

/**
 * Options for projecting fields in query results
 */
export type ProjectionOptions = {
  [key: string]: ProjectionValue;
};

/**
 * Options for query execution
 */
export interface QueryOptions {
  sort?: SortOptions;
  limit?: number;
  skip?: number;
  projection?: ProjectionOptions;
}

/**
 * Complete Query API request structure
 */
export interface QueryAPIRequest {
  filter?: FilterCondition;
  options?: QueryOptions;
}

// Constants for validation
export const VALID_OPERATORS: MongoOperator[] = [
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

export const VALID_FIELDS: QueryableField[] = [
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

export const MAX_LIMIT = 10000;
export const DEFAULT_LIMIT = 100;
export const DEFAULT_EXCLUSIONS = {
  _id: 0,
  __v: 0,
  createdAt: 0,
  updatedAt: 0,
  kill_time_str: 0,
};

// Builder functions

/**
 * Creates a complete query request object for the Query API
 * @param filter - Filter conditions for the query
 * @param options - Query execution options
 * @returns A properly formatted query request
 */
export function createQuery(filter?: FilterCondition, options?: QueryOptions): QueryAPIRequest {
  return { filter, options };
}

/**
 * Creates a filter for a specific field
 * @param field - Field to filter on
 * @param value - Value to filter by
 * @returns A filter condition for the specified field
 */
export function field(field: QueryableField, value: FilterValue): FilterCondition {
  return { [field]: value };
}

/**
 * Creates a 'greater than' comparison filter
 * @param value - The value to compare against
 * @returns A greater than filter expression
 */
export function gt(value: SimpleFilterValue): OperatorFilterValue {
  return { $gt: value };
}

/**
 * Creates a 'greater than or equal' comparison filter
 * @param value - The value to compare against
 * @returns A greater than or equal filter expression
 */
export function gte(value: SimpleFilterValue): OperatorFilterValue {
  return { $gte: value };
}

/**
 * Creates a 'less than' comparison filter
 * @param value - The value to compare against
 * @returns A less than filter expression
 */
export function lt(value: SimpleFilterValue): OperatorFilterValue {
  return { $lt: value };
}

/**
 * Creates a 'less than or equal' comparison filter
 * @param value - The value to compare against
 * @returns A less than or equal filter expression
 */
export function lte(value: SimpleFilterValue): OperatorFilterValue {
  return { $lte: value };
}

/**
 * Creates an 'equal' comparison filter
 * @param value - The value to compare against
 * @returns An equal filter expression
 */
export function eq(value: SimpleFilterValue): OperatorFilterValue {
  return { $eq: value };
}

/**
 * Creates a 'not equal' comparison filter
 * @param value - The value to compare against
 * @returns A not equal filter expression
 */
export function ne(value: SimpleFilterValue): OperatorFilterValue {
  return { $ne: value };
}

/**
 * Creates an 'in' comparison filter
 * @param values - Array of values to check against
 * @returns An 'in' filter expression
 */
export function inArray(values: SimpleFilterValue[]): OperatorFilterValue {
  return { $in: values };
}

/**
 * Creates a 'not in' comparison filter
 * @param values - Array of values to exclude
 * @returns A 'not in' filter expression
 */
export function notInArray(values: SimpleFilterValue[]): OperatorFilterValue {
  return { $nin: values };
}

/**
 * Creates an 'exists' filter
 * @param exists - Whether the field should exist
 * @returns An 'exists' filter expression
 */
export function exists(exists: boolean): OperatorFilterValue {
  return { $exists: exists };
}

/**
 * Creates a combined 'OR' filter
 * @param conditions - Array of conditions to OR together
 * @returns An OR filter
 */
export function or(conditions: FilterCondition[]): FilterCondition {
  return { $or: conditions };
}

/**
 * Creates a combined 'AND' filter
 * @param conditions - Array of conditions to AND together
 * @returns An AND filter
 */
export function and(conditions: FilterCondition[]): FilterCondition {
  return { $and: conditions };
}

/**
 * Creates a time range filter for kill_time field
 * @param from - Start timestamp (UNIX seconds)
 * @param to - End timestamp (UNIX seconds)
 * @returns A time range filter
 */
export function timeRange(from: number, to: number): FilterCondition {
  return {
    kill_time: {
      $gte: from,
      $lte: to,
    },
  };
}

/**
 * Creates sort options for the query
 * @param field - Field to sort by
 * @param direction - Sort direction
 * @returns Sort options object
 */
export function sort(field: QueryableField, direction: SortDirection): SortOptions {
  return { [field]: direction };
}

/**
 * Creates projection options to include specific fields
 * @param fields - Array of fields to include
 * @returns Projection options object
 */
export function include(...fields: string[]): ProjectionOptions {
  const projection: ProjectionOptions = { _id: 0 };
  for (const field of fields) {
    projection[field] = 1;
  }
  return projection;
}

/**
 * Creates projection options to exclude specific fields
 * @param fields - Array of fields to exclude
 * @returns Projection options object
 */
export function exclude(...fields: string[]): ProjectionOptions {
  const projection: ProjectionOptions = {};
  for (const field of fields) {
    projection[field] = 0;
  }
  return projection;
}

/**
 * Creates query options
 * @param options - Options for the query
 * @returns Query options object
 */
export function options(options: QueryOptions): QueryOptions {
  return options;
}

// Validation functions

/**
 * Checks if a field is valid for queries
 * @param field - Field name to check
 * @returns Whether the field is valid
 */
export function isValidField(field: string): field is QueryableField {
  return VALID_FIELDS.includes(field as QueryableField);
}

/**
 * Checks if an operator is valid
 * @param operator - Operator to check
 * @returns Whether the operator is valid
 */
export function isValidOperator(operator: string): operator is MongoOperator {
  return VALID_OPERATORS.includes(operator as MongoOperator);
}

/**
 * Validates a query request object
 * @param query - Query request to validate
 * @returns The validated query or throws an error
 */
export function validateQuery(query: QueryAPIRequest): QueryAPIRequest {
  if (!query || typeof query !== "object") {
    throw new Error("Query must be an object");
  }

  // Basic structure validation
  if (!query.filter && !query.options) {
    throw new Error("Query must have at least one of filter or options");
  }

  // We could add more validation here but the API will validate thoroughly

  return query;
}
