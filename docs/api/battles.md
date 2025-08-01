# Battles API

## `GET /api/battles/{id}`

**Description:** Retrieves detailed information about a specific battle, processed for frontend display. This includes battle statistics, involved entities, and optionally, associated killmails.

**Parameters:**
*   **Path Parameters:**
    *   `{id}`: The ID of the battle to retrieve.
*   **Query Parameters:**
    *   `includeKillmails`: (Optional) Boolean, defaults to `true`. If `false`, killmail data will not be included in the response, making it lighter.
*   **Body Parameters:** None

**Example Request (Conceptual):**
```typescript
// Get battle details including killmails
// const battleDataWithKills = await $fetch('/api/battles/12345');

// Get battle details without killmails
// const battleDataNoKills = await $fetch('/api/battles/12345?includeKillmails=false');
```

**Example Response (Conceptual - structure based on `processBattleDataForFrontend`):**
```json
{
  "battle_id": 12345,
  "start_time": "2023-10-26T10:00:00Z",
  "end_time": "2023-10-26T12:00:00Z",
  "last_updated": "2023-10-27T08:00:00Z",
  "solar_system_id": 30000142,
  "solar_system_name": "Jita",
  "region_id": 10000002,
  "region_name": "The Forge",
  "constellation_id": 20000020,
  "constellation_name": "Kimotoro",
  "total_value": 150000000000, // 150 Billion ISK
  "total_kills": 250,
  "involved_sides": { // Simplified structure
    "sideA": {
      "total_value_lost": 50000000000,
      "total_kills": 100,
      "entities": [
        { "id": 99000001, "name": "Alliance A", "type": "alliance", "value_lost": 20000000000, "kills": 40 }
      ]
    },
    "sideB": {
      "total_value_lost": 100000000000,
      "total_kills": 150,
      "entities": [
        { "id": 99000002, "name": "Alliance B", "type": "alliance", "value_lost": 60000000000, "kills": 90 }
      ]
    }
  },
  "killmails": [ // Only if includeKillmails is true
    // ... array of killmail objects ...
  ],
  "summary_stats": {
    "total_pilots": 500,
    "total_corporations": 20,
    "total_alliances": 5
    // ... other summary stats ...
  }
  // ... other processed battle data ...
}
```

## `POST /api/battles/custom`

**Description:** Creates and saves a custom battle report. This endpoint expects a pre-compiled battle document, typically generated by the `/api/battles/preview` endpoint. It marks the battle as custom and saves it to the database.

**Parameters:**
*   **Path Parameters:** None
*   **Query Parameters:** None
*   **Body Parameters:**
    *   A battle document object (structure should match the output of `/api/battles/preview` and the `IBattle` interface). It must include at least a `battle_id`.

**Example Request (Conceptual):**
```typescript
// Assume 'battlePreviewData' is the result from /api/battles/preview
// const battlePreviewData = {
//   battle_id: 123456789, // Generated by preview
//   start_time: "2023-11-01T10:00:00Z",
//   end_time: "2023-11-01T11:00:00Z",
//   // ... other fields from IBattle populated by the preview endpoint
//   custom: true // This will be ensured by the endpoint
// };

// const response = await $fetch('/api/battles/custom', {
//   method: 'POST',
//   body: battlePreviewData
// });
```

**Example Response (Conceptual - Success):**
```json
{
  "battle_id": 123456789,
  "message": "Custom battle created successfully"
}
```

**Example Response (Conceptual - Error):**
```json
// If battleDocument is invalid
// Status: 400
{
  "statusCode": 400,
  "statusMessage": "apiErrors.customBattles.custom.invalidBattleData", // Key for translation
  // ... other error details
}

// If internal server error
// Status: 500
{
  "statusCode": 500,
  "statusMessage": "apiErrors.customBattles.custom.internalServerError", // Key for translation
  // ... other error details
}
```

## `POST /api/battles/entities`

**Description:** Fetches unique alliances and corporations involved in killmails within specified solar systems and a given time frame. This is used to populate entity selection for creating custom battle reports.

**Parameters:**
*   **Path Parameters:** None
*   **Query Parameters:** None
*   **Body Parameters:**
    *   `systemIds`: (Required) An array of solar system IDs (integers). Maximum of 5 system IDs.
    *   `startTime`: (Required) ISO 8601 string representing the start of the time window.
    *   `endTime`: (Required) ISO 8601 string representing the end of the time window. The duration between `startTime` and `endTime` cannot exceed 36 hours.

**Example Request (Conceptual):**
```typescript
// const requestBody = {
//   systemIds: [30000142, 30002187], // Jita and Amarr
//   startTime: "2023-11-01T10:00:00Z",
//   endTime: "2023-11-01T14:00:00Z"
// };

// const response = await $fetch('/api/battles/entities', {
//   method: 'POST',
//   body: requestBody
// });
```

**Example Response (Conceptual - Success):**
```json
{
  "alliances": [
    { "id": 99000001, "name": "Alliance Alpha" },
    { "id": 99000002, "name": "Alliance Bravo" }
    // ... other unique alliances involved
  ],
  "corporations": [
    { "id": 98000001, "name": "Corporation X", "alliance_id": 99000001, "alliance_name": "Alliance Alpha" },
    { "id": 98000002, "name": "Corporation Y", "alliance_id": null, "alliance_name": null }
    // ... other unique corporations involved
  ]
}
```

**Example Response (Conceptual - Error):**
```json
// If systemIds is missing or invalid
// Status: 400
{
  "statusCode": 400,
  "statusMessage": "apiErrors.customBattles.entities.systemIdRequired", // Key for translation
  // ... other error details
}

// If timespan exceeds 36 hours
// Status: 400
{
  "statusCode": 400,
  "statusMessage": "apiErrors.customBattles.entities.maxTimespan", // Key for translation
  // ... other error details
}

// If internal server error
// Status: 500
{
  "statusCode": 500,
  "statusMessage": "apiErrors.customBattles.entities.internalServerError", // Key for translation
  // ... other error details
}
```

## `GET /api/battles`

**Description:** Retrieves a paginated list of all battles, sorted by start time in descending order. Returns a summarized version of battle data suitable for list displays.

**Parameters:**
*   **Path Parameters:** None
*   **Query Parameters:**
    *   `page`: (Optional) The page number to retrieve (default: 1).
    *   `limit`: (Optional) The number of battles per page (default: 20, min: 1, max: 100).
*   **Body Parameters:** None

**Example Request (Conceptual):**
```typescript
// Get the first page of battles with default limit
// const dataPage1 = await $fetch('/api/battles');

// Get the third page of battles with 50 items per page
// const dataPage3Limit50 = await $fetch('/api/battles?page=3&limit=50');
```

**Example Response (Conceptual):**
```json
{
  "totalItems": 1250,
  "totalPages": 63, // Assuming limit is 20
  "currentPage": 1,
  "itemsPerPage": 20,
  "battles": [
    {
      "battle_id": 98765,
      "start_time": "2023-11-01T15:00:00Z",
      "end_time": "2023-11-01T16:30:00Z",
      "duration_ms": 5400000,
      "systems": [ // New field, if populated
        { "system_id": 30000142, "name": "Jita", "security_status": 0.9, "region_id": 10000002, "region_name": "The Forge" }
      ],
      // Legacy single system fields (might be present for older battles or if `systems` array is not populated)
      "system_id": 30000142,
      "system_name": "Jita",
      "system_security": 0.9,
      "region_id": 10000002,
      "region_name": "The Forge",
      "killmailsCount": 150,
      "iskDestroyed": 75000000000, // 75 Billion ISK
      "involved_alliances_count": 3, // Or derived from alliancesInvolved.length
      "involved_corporations_count": 10, // Or derived from corporationsInvolved.length
      "involved_characters_count": 80, // Or derived from charactersInvolved.length
      "alliancesInvolved": [99000001, 99000002, 99000003], // For counts if specific count fields are missing
      "corporationsInvolved": [/* ...corporation_ids... */],
      "charactersInvolved": [/* ...character_ids... */],
      "top_alliances": [
        { "id": 99000001, "name": "Alliance X", "kills": 50, "value": 30000000000 }
        // ... up to 10
      ],
      "top_corporations": [
        { "id": 98000001, "name": "Corp Y", "kills": 20, "value": 10000000000 }
        // ... up to 10
      ],
      "top_ship_types": [
        { "id": 670, "name": "Capsule", "count": 30 }
        // ... up to 10
      ]
    }
    // ... other battles
  ]
}
```

## `POST /api/battles/preview`

**Description:** Generates a preview of a custom battle report based on specified systems, involved sides (teams of alliances/corporations), and a time window. It fetches relevant killmails and compiles a battle document without saving it to the database. This allows users to review the potential battle report before creation.

**Parameters:**
*   **Path Parameters:** None
*   **Query Parameters:** None
*   **Body Parameters:**
    *   `systems`: (Required) An array of system objects, each containing `system_id`. Maximum of 5 systems.
        *   Example: `[{ "system_id": 30000142 }, { "system_id": 30002187 }]`
    *   `sides`: (Required) An array of side objects, defining the teams. Minimum of 2 sides, maximum of 4. Each side object has:
        *   `side_id`: A unique string identifier for the side (e.g., "teamA", "teamB").
        *   `name`: A display name for the side.
        *   `entities`: An array of entity objects, each with:
            *   `id`: The alliance ID or corporation ID.
            *   `type`: Either `'alliance'` or `'corporation'`.
    *   `startTime`: (Required) ISO 8601 string representing the start of the time window.
    *   `endTime`: (Required) ISO 8601 string representing the end of the time window. The duration between `startTime` and `endTime` cannot exceed 36 hours.

**Example Request (Conceptual):**
```typescript
// const requestBody = {
//   systems: [{ "system_id": 30000142 }, { "system_id": 30002187 }],
//   sides: [
//     {
//       side_id: "attackers",
//       name: "The Aggressors",
//       entities: [
//         { id: 99000001, type: 'alliance' },
//         { id: 98000001, type: 'corporation' }
//       ]
//     },
//     {
//       side_id: "defenders",
//       name: "The Valiant",
//       entities: [
//         { id: 99000002, type: 'alliance' }
//       ]
//     }
//   ],
//   startTime: "2023-11-01T10:00:00Z",
//   endTime: "2023-11-01T12:00:00Z"
// };

// const battlePreview = await $fetch('/api/battles/preview', {
//   method: 'POST',
//   body: requestBody
// });
```

**Example Response (Conceptual - Success):**
```json
// This will be a full battle document object, similar to the response of GET /api/battles/{id},
// but with `custom: true` and not yet saved.
// Structure will be based on IBattle and the output of compileFullBattleData.
{
  "battle_id": 169883280030000142, // Example generated ID
  "start_time": "2023-11-01T10:00:00.000Z",
  "end_time": "2023-11-01T12:00:00.000Z",
  "last_updated": "2023-11-01T12:00:00.000Z", // Or current time
  "custom": true,
  "systems_involved": [ // Populated based on input `systems` and enriched
    { "system_id": 30000142, "system_name": "Jita", "system_security": 0.9, "region_id": 10000002, "region_name": "The Forge" },
    { "system_id": 30002187, "system_name": "Amarr", "system_security": 1.0, "region_id": 10000043, "region_name": "Domain" }
  ],
  "involved_sides": {
    "attackers": {
      "name": "The Aggressors",
      "total_value_lost": 2500000000,
      "total_kills": 15,
      "entities": [
        // entities from side 'attackers' with their stats
      ],
      "ship_types": [ /* ... */ ],
      "corporations": [ /* ... */ ],
      "alliances": [ /* ... */ ]
    },
    "defenders": {
      "name": "The Valiant",
      "total_value_lost": 1800000000,
      "total_kills": 10,
      "entities": [
        // entities from side 'defenders' with their stats
      ],
      "ship_types": [ /* ... */ ],
      "corporations": [ /* ... */ ],
      "alliances": [ /* ... */ ]
    }
  },
  "summary_stats": { /* ... */ },
  "killmails": [ /* ... relevant killmails ... */ ]
  // ... other fields from IBattle
}
```

**Example Response (Conceptual - Error):**
```json
// If no killmails found for the criteria
// Status: 404
{
  "statusCode": 404,
  "statusMessage": "apiErrors.customBattles.preview.noKillmails", // Key for translation
  // ... other error details
}

// If validation fails (e.g., too many systems, invalid time)
// Status: 400
{
  "statusCode": 400,
  "statusMessage": "apiErrors.customBattles.preview.maxSystems", // Or other specific key
  // ... other error details
}
```

## `GET /api/battles/killmail/{id}/inbattle`

**Description:** Checks if a specific killmail is associated with any existing battle report.

**Parameters:**
*   **Path Parameters:**
    *   `{id}`: The ID of the killmail to check.
*   **Query Parameters:** None
*   **Body Parameters:** None

**Example Request (Conceptual):**
```typescript
// const killmailIdToCheck = 12345678;
// const response = await $fetch(`/api/battles/killmail/${killmailIdToCheck}/inbattle`);
```

**Example Response (Conceptual):**
```json
{
  "inBattle": true // or false
}
```

## `GET /api/battles/killmail/{id}`

**Description:** Retrieves the battle report associated with a specific killmail ID. If the killmail is part of a battle, this endpoint returns the processed battle data, similar to `GET /api/battles/{battle_id}`.

**Parameters:**
*   **Path Parameters:**
    *   `{id}`: The ID of the killmail.
*   **Query Parameters:**
    *   `includeKillmails`: (Optional) Boolean, defaults to `true`. If `false`, killmail data will not be included in the response if a battle is found.
*   **Body Parameters:** None

**Example Request (Conceptual):**
```typescript
// Get battle data associated with killmail 12345678, including all killmails for that battle
// const battleData = await $fetch('/api/battles/killmail/12345678');

// Get battle data, but without the full killmail list for that battle
// const battleDataNoKills = await $fetch('/api/battles/killmail/12345678?includeKillmails=false');
```

**Example Response (Conceptual - Battle Found):**
```json
// The response structure will be the same as GET /api/battles/{id}
// if a battle is found for the given killmail.
// See the example response for GET /api/battles/{id}.
// If no battle is associated with the killmail, it returns null.
null
```
