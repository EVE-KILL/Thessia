# Query API

This API is used for creating, saving, loading, and executing complex queries against killmail data.

## `POST /api/query`

**Description:** Executes a complex, MongoDB-style query against the killmail data. This endpoint allows for detailed filtering, sorting, pagination (skip/limit), and projection of results. It intelligently determines the best database index to use for the query.

**Parameters:**
*   **Path Parameters:** None
*   **Query Parameters:** None
*   **Body Parameters:** (Required) A JSON object with the following structure:
    *   `filter`: (Optional) An object defining the filter conditions, similar to MongoDB's find query.
        *   Supports standard MongoDB operators like `$eq`, `$ne`, `$gt`, `$gte`, `$lt`, `$lte`, `$in`, `$nin`, `$exists`, `$regex`.
        *   Also supports logical operators `$and` and `$or` which take an array of filter conditions.
        *   Field names must be valid and exist in the `Killmails` schema (see `VALID_FIELDS` in `shared/helpers/queryAPIHelper.ts`).
        *   `kill_time` values (e.g., for `$gt`, `$lte`) should be provided as Unix timestamps (seconds), which will be converted to Date objects internally.
    *   `options`: (Optional) An object defining query options:
        *   `limit`: (Optional) Integer, the maximum number of documents to return (default: 100, max: 1000, as defined by `DEFAULT_LIMIT` and `MAX_LIMIT`).
        *   `skip`: (Optional) Integer, the number of documents to skip (default: 0).
        *   `sort`: (Optional) An object specifying the sort order (e.g., `{ "kill_time": -1 }` for descending by kill time, or `{ "total_value": "asc" }`). Use `1` or `"asc"` for ascending, `-1` or `"desc"` for descending. Defaults to `{ "kill_time": -1 }`.
        *   `projection`: (Optional) An object specifying which fields to include or exclude.
            *   To include specific fields: `{ "killmail_id": 1, "kill_time": 1, "victim.character_name": 1 }`. `_id` is excluded by default in inclusion mode.
            *   To exclude specific fields (from the default set of included fields): `{ "items": 0, "involved_parties": 0 }`. `DEFAULT_EXCLUSIONS` are applied first.

**Example Request (Conceptual):**
```typescript
// const queryPayload = {
//   filter: {
//     "victim.alliance_id": 99003581, // Example: Goonswarm Federation
//     "total_value": { "$gte": 1000000000 }, // Value >= 1 Billion ISK
//     "kill_time": { "$gte": Math.floor(new Date('2023-01-01T00:00:00Z').getTime() / 1000) } // After Jan 1, 2023
//   },
//   options: {
//     limit: 50,
//     skip: 0,
//     sort: { "kill_time": -1 }, // Sort by most recent first
//     projection: { "killmail_id": 1, "kill_time": 1, "total_value": 1, "victim.ship_name": 1 }
//   }
// };

// const results = await $fetch('/api/query', {
//   method: 'POST',
//   body: queryPayload
// });
```

**Example Response (Conceptual - Success):**
```json
[
  {
    "killmail_id": 102938475,
    "kill_time": "2023-10-27T10:00:00Z",
    "total_value": 1500000000,
    "victim": {
      "ship_name": { "en": "Nyx" }
    }
  },
  {
    "killmail_id": 102938400,
    "kill_time": "2023-10-26T15:30:00Z",
    "total_value": 2100000000,
    "victim": {
      "ship_name": { "en": "Erebus" }
    }
  }
  // ... up to 'limit' documents matching the query
]
```

**Example Response (Conceptual - Error):**
```json
// If request body is invalid or query validation fails
// Status: 400
{
  "statusCode": 400,
  "statusMessage": "Invalid request body: expected JSON object"
  // or "Error in filter: Invalid filter field: non_existent_field"
  // or "Invalid option: bad_option"
}

// If an internal server error occurs
// Status: 500
{
  "statusCode": 500,
  "statusMessage": "Internal server error message from query processing"
}
```

**Notes on Validation and Behavior:**
*   The API performs validation on field names, operators, and value types.
*   `kill_time` in filters expects Unix timestamps (seconds) and converts them to Date objects.
*   The `limit` is capped by `MAX_LIMIT` (currently 1000).
*   If `projection` specifies fields to include (value `1`), it switches to an inclusion mode, otherwise it's an exclusion mode (value `0`) on top of `DEFAULT_EXCLUSIONS`.
*   The system attempts to determine an optimal database index hint based on the filter and sort criteria.
*   The cache key for this endpoint is a SHA256 hash of the request body, ensuring unique caching for unique queries.

## `GET /api/query/load`

**Description:** Loads a previously saved query by its ID (hash).
**Note:** The current implementation includes a development-only feature: if a query ID is not found, it creates and returns a sample query. This behavior should be removed in production.

**Parameters:**
*   **Path Parameters:** None
*   **Query Parameters:**
    *   `id`: (Required) String, the hash (ID) of the saved query to load.
*   **Body Parameters:** None

**Example Request (Conceptual):**
```typescript
// const queryIdToLoad = "a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0"; // Example hash
// const loadedQueryData = await $fetch(`/api/query/load?id=${queryIdToLoad}`);
```

**Example Response (Conceptual - Success, query found):**
```json
{
  "title": "My Goonswarm Super Kills",
  "description": "Expensive losses for Goonswarm Federation in the last month.",
  "query": { // The actual QueryAPIRequest structure
    "filter": {
      "victim.alliance_id": 99003581,
      "total_value": { "$gte": 10000000000 } // >= 10 Billion ISK
    },
    "options": {
      "sort": { "kill_time": -1 },
      "limit": 100
    }
  },
  "hash": "a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0"
}
```

**Example Response (Conceptual - Success, query not found - DEV ONLY BEHAVIOR):**
```json
// If 'id' (hash) is not found, a sample query is created and returned (dev only)
{
  "title": "Sample Query",
  "description": "Automatically created sample query",
  "query": {
    "filter": {
      "victim.alliance_id": 99003581
    },
    "options": {
      "sort": { "kill_time": -1 },
      "limit": 50
    }
  },
  "hash": "the_provided_non_existent_id"
}
```

**Example Response (Conceptual - Error):**
```json
// If 'id' query parameter is missing
// Status: 400
{
  "statusCode": 400,
  "statusMessage": "Missing query ID"
}

// If an internal server error occurs during loading
// Status: 500
{
  "statusCode": 500,
  "statusMessage": "Failed to load saved query"
}
```

## `POST /api/query/save`

**Description:** Saves or updates a complex query. If an `id` (hash) is provided in the body and a query with that hash exists, it updates the existing query. Otherwise, it creates a new saved query and generates a new unique 10-character hash for it.

**Parameters:**
*   **Path Parameters:** None
*   **Query Parameters:** None
*   **Body Parameters:** (Required) A JSON object with the following structure:
    *   `title`: (Required) String, a title for the saved query.
    *   `description`: (Optional) String, a description for the saved query. Defaults to an empty string if not provided.
    *   `query`: (Required) The `QueryAPIRequest` object (the actual filter and options for the query, as defined in `POST /api/query`).
    *   `id`: (Optional) String, the hash of an existing query to update. If not provided, a new query is created.

**Example Request (Conceptual - New Query):**
```typescript
// const newQueryToSave = {
//   title: "My Expensive Frigate Losses",
//   description: "Tracking frigate losses over 100M ISK in the last week.",
//   query: {
//     filter: {
//       "victim.ship_group_id": 25, // Frigate group ID
//       "total_value": { "$gte": 100000000 },
//       "kill_time": { "$gte": Math.floor((Date.now() - 7 * 24 * 60 * 60 * 1000) / 1000) }
//     },
//     options: {
//       sort: { "total_value": -1 }
//     }
//   }
// };

// const response = await $fetch('/api/query/save', {
//   method: 'POST',
//   body: newQueryToSave
// });
// // response will be like: { "hash": "newly_generated_hash" }
```

**Example Request (Conceptual - Update Existing Query):**
```typescript
// const queryToUpdate = {
//   id: "existing_query_hash", // Hash of the query to update
//   title: "Updated Frigate Losses Title",
//   description: "Now tracking losses over 150M ISK.",
//   query: {
//     filter: {
//       "victim.ship_group_id": 25,
//       "total_value": { "$gte": 150000000 }, // Updated value
//       "kill_time": { "$gte": Math.floor((Date.now() - 7 * 24 * 60 * 60 * 1000) / 1000) }
//     },
//     options: {
//       sort: { "total_value": -1 }
//     }
//   }
// };

// const updateResponse = await $fetch('/api/query/save', {
//   method: 'POST',
//   body: queryToUpdate
// });
// // updateResponse will be like: { "hash": "existing_query_hash" }
```

**Example Response (Conceptual - Success):**
```json
{
  "hash": "a1b2c3d4e5" // The 10-character hash of the saved/updated query
}
```

**Example Response (Conceptual - Error):**
```json
// If title or query is missing
// Status: 400
{
  "statusCode": 400,
  "statusMessage": "Missing title or query"
}

// If 'id' is provided for an update, but the query is not found
// Status: 404
{
  "statusCode": 404,
  "statusMessage": "Query not found"
}

// If an internal server error occurs during saving/updating
// Status: 500
{
  "statusCode": 500,
  "statusMessage": "Failed to save query"
}
```

## `POST /api/query/validate`

**Description:** Validates a list of query "facets" (field-value pairs) for logical consistency, primarily checking hierarchical relationships between EVE Online entities (e.g., if a selected system belongs to a selected region, or if a character belongs to a selected corporation).
**Note:** The current implementation uses static, empty lookup maps (e.g., `SYSTEM_TO_REGION`, `CHAR_TO_CORP`) for these checks. In a production environment, these would need to be populated with actual game data or lookups against a database/cache. As a result, it will currently not produce any warnings unless these maps are populated.

**Parameters:**
*   **Path Parameters:** None
*   **Query Parameters:** None
*   **Body Parameters:** (Required) A JSON object with the following structure:
    *   `facets`: (Required) An array of objects, where each object represents a filter criterion (a "facet"). Each facet object should have:
        *   `field`: String, the name of the field being filtered (e.g., `"region_id"`, `"victim.character_id"`).
        *   `value`: The value for that field (e.g., `10000002`, `90000001`).

**Example Request (Conceptual):**
```typescript
// const facetsToValidate = {
//   facets: [
//     { field: "region_id", value: 10000002 }, // The Forge
//     { field: "system_id", value: 30000142 }, // Jita (which is in The Forge)
//     { field: "victim.corporation_id", value: 98000001 },
//     { field: "victim.alliance_id", value: 99000001 } // Assume corp 98000001 is in alliance 99000001
//   ]
// };

// const validationResponse = await $fetch('/api/query/validate', {
//   method: 'POST',
//   body: facetsToValidate
// });

// Example with a potential inconsistency (if Jita was not in The Forge in the lookup data):
// const inconsistentFacets = {
//   facets: [
//     { field: "region_id", value: 10000002 }, // The Forge
//     { field: "system_id", value: 30002187 }  // Amarr (not in The Forge)
//   ]
// };
// const inconsistentValidation = await $fetch('/api/query/validate', {
//   method: 'POST',
//   body: inconsistentFacets
// });
```

**Example Response (Conceptual - Success, No Warnings):**
```json
// Assuming all hierarchical relationships are correct based on (currently empty) lookup data
{
  "warnings": []
}
```

**Example Response (Conceptual - Success, With Warnings):**
```json
// If SYSTEM_TO_REGION[30002187] was 10000043 (Domain) and not 10000002 (The Forge)
{
  "warnings": [
    "System 30002187 does not belong to the selected region 10000002."
    // ... other warnings if more inconsistencies are found
  ]
}
```

**Example Response (Conceptual - Error):**
```json
// If 'facets' array is missing or not an array
// Status: 400
{
  "statusCode": 400,
  "statusMessage": "Missing or invalid facets array"
}
```
