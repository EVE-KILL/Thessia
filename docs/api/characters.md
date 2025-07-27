# Characters API

## `GET /api/characters/count`

**Description:** Returns the estimated total number of characters in the database.

**Parameters:**
*   **Path Parameters:** None
*   **Query Parameters:** None
*   **Body Parameters:** None

**Example Request (Conceptual):**
```typescript
// const data = await $fetch('/api/characters/count');
```

**Example Response (Conceptual):**
```json
{
  "count": 12345678
}
```

## `GET /api/characters`

**Description:** Returns a paginated list of all character IDs. Each page contains up to 100,000 character IDs.

**Parameters:**
*   **Path Parameters:** None
*   **Query Parameters:**
    *   `page`: (Optional) The page number to retrieve (default: 1).
*   **Body Parameters:** None

**Example Request (Conceptual):**
```typescript
// Get the first page of character IDs
// const dataPage1 = await $fetch('/api/characters');

// Get the second page of character IDs
// const dataPage2 = await $fetch('/api/characters?page=2');
```

**Example Response (Conceptual):**
```json
[
  90000001,
  90000002,
  // ... up to 100,000 character_ids
]
```

## `GET /api/characters/{id}/battles`

**Description:** Retrieves a paginated list of battles in which a specific character was involved.

**Parameters:**
*   **Path Parameters:**
    *   `{id}`: The ID of the character.
*   **Query Parameters:**
    *   `page`: (Optional) The page number to retrieve (default: 1).
    *   `limit`: (Optional) The number of battles per page (default: 20, min: 1, max: 100).
*   **Body Parameters:** None

**Example Request (Conceptual):**
```typescript
// const characterId = 90000001;
// const battlesData = await $fetch(`/api/characters/${characterId}/battles?page=1&limit=10`);
```

**Example Response (Conceptual):**
```json
{
  "totalItems": 25,
  "totalPages": 3, // Assuming limit is 10
  "currentPage": 1,
  "itemsPerPage": 10,
  "battles": [
    {
      "battle_id": "unique_battle_id_1",
      "start_time": "2023-10-27T10:00:00Z",
      "end_time": "2023-10-27T11:00:00Z",
      "charactersInvolved": [90000001, 90000002, /* ... */],
      // ... other battle details (structure similar to GET /api/battles/{id} but potentially summarized)
    }
    // ... other battles
  ]
}
```

## `GET /api/characters/{id}/corporationhistory`

**Description:** Retrieves the corporation history for a specific character. Each record includes the corporation details (ID, name, ticker), alliance details (if any), and the start and end dates of the character's tenure in that corporation. The history is returned in reverse chronological order (most recent first).

**Parameters:**
*   **Path Parameters:**
    *   `{id}`: The ID of the character.
*   **Query Parameters:** None
*   **Body Parameters:** None

**Example Request (Conceptual):**
```typescript
// const characterId = 90000001;
// const corpHistory = await $fetch(`/api/characters/${characterId}/corporationhistory`);
```

**Example Response (Conceptual):**
```json
[
  {
    "record_id": 123456790, // ESI record ID
    "corporation_id": 98000002,
    "corporation_name": "Current Corp Inc.",
    "corporation_ticker": "CCI",
    "alliance_id": 99000002,
    "alliance_name": "Current Alliance",
    "start_date": "2023-05-01T10:00:00Z",
    "end_date": null // null if current corporation
  },
  {
    "record_id": 123456789,
    "corporation_id": 98000001,
    "corporation_name": "Previous Corp Ltd.",
    "corporation_ticker": "PCL",
    "alliance_id": 99000001,
    "alliance_name": "Previous Alliance",
    "start_date": "2022-01-15T12:00:00Z",
    "end_date": "2023-05-01T10:00:00Z"
  }
  // ... other history records
]
// Or if history is not found or empty:
// { "error": "Character history not found" }
```

## `GET /api/characters/{id}`

**Description:** Retrieves detailed information about a specific character. This includes their ESI data, enriched with corporation name, alliance name, faction name, bloodline details, and race details from the database.

**Parameters:**
*   **Path Parameters:**
    *   `{id}`: The ID of the character.
*   **Query Parameters:** None
*   **Body Parameters:** None

**Example Request (Conceptual):**
```typescript
// const characterId = 90000001;
// const characterData = await $fetch(`/api/characters/${characterId}`);
```

**Example Response (Conceptual):**
```json
{
  "character_id": 90000001,
  "name": "CCP Player",
  "description": "A brave capsuleer.",
  "corporation_id": 98000001,
  "alliance_id": 99000001,
  "faction_id": 500001,
  "birthday": "2010-01-15T10:00:00Z",
  "gender": "male",
  "race_id": 1, // Example Caldari
  "bloodline_id": 5, // Example Deteis
  "security_status": 1.5,
  // ... other fields from ESI character endpoint ...
  "corporation_name": "Player Corporation Inc.",
  "alliance_name": "Player Alliance Collective",
  "faction_name": "Caldari State",
  "bloodline_name": "Deteis",
  "bloodline_description": "A common Caldari bloodline.",
  "race_name": "Caldari",
  "race_description": "The Caldari are a race of humans."
}
// Or if character ID not provided:
// { "error": "Character ID not provided" }
```

## `GET /api/characters/{id}/shortstats`

**Description:** Retrieves a short statistical summary for a specific character. This can be for all time or a specified number of past days. If stats are not found, empty stats are returned.

**Parameters:**
*   **Path Parameters:**
    *   `{id}`: The ID of the character.
*   **Query Parameters:**
    *   `days`: (Optional) The number of past days to include in the stats (e.g., 7, 30). If 0 or not provided, stats for all time are returned.
*   **Body Parameters:** None

**Example Request (Conceptual):**
```typescript
// const characterId = 90000001;
// Get all-time short stats
// const statsAllTime = await $fetch(`/api/characters/${characterId}/shortstats`);

// Get short stats for the last 7 days
// const stats7Days = await $fetch(`/api/characters/${characterId}/shortstats?days=7`);
```

**Example Response (Conceptual - structure based on `IStats`):**
```json
{
  "type": "character_id",
  "id": 90000001,
  "days": 0, // Or the number of days specified
  "killCount": 150,
  "lossCount": 30,
  "iskKilled": 10000000000, // 10 Billion ISK
  "iskLost": 2000000000,   // 2 Billion ISK
  "efficiency": 83.33,
  "shipsKilled": 120,
  "shipsLost": 25,
  "updatedAt": "2023-10-27T10:00:00Z"
  // Other fields from IStats if applicable, or defaults if empty stats are returned
}
// Or if character ID not provided:
// { "error": "Character ID not provided" }
```

## `GET /api/characters/{id}/stats`

**Description:** Retrieves a statistical summary for a specific character. This can be for all time or a specified number of past days. If stats are not found, empty stats are returned. (Currently, this endpoint is identical to `shortstats`. It might be intended for more detailed stats in the future).

**Parameters:**
*   **Path Parameters:**
    *   `{id}`: The ID of the character.
*   **Query Parameters:**
    *   `days`: (Optional) The number of past days to include in the stats (e.g., 7, 30). If 0 or not provided, stats for all time are returned.
*   **Body Parameters:** None

**Example Request (Conceptual):**
```typescript
// const characterId = 90000001;
// Get all-time stats
// const statsAllTime = await $fetch(`/api/characters/${characterId}/stats`);

// Get stats for the last 7 days
// const stats7Days = await $fetch(`/api/characters/${characterId}/stats?days=7`);
```

**Example Response (Conceptual - structure based on `IStats`):**
```json
{
  "type": "character_id",
  "id": 90000001,
  "days": 0, // Or the number of days specified
  "killCount": 150,
  "lossCount": 30,
  "iskKilled": 10000000000, // 10 Billion ISK
  "iskLost": 2000000000,   // 2 Billion ISK
  "efficiency": 83.33,
  "shipsKilled": 120,
  "shipsLost": 25,
  "updatedAt": "2023-10-27T10:00:00Z"
  // Other fields from IStats if applicable, or defaults if empty stats are returned
}
// Or if character ID not provided:
// { "error": "Character ID not provided" }
```

## `GET /api/characters/{id}/top`

**Description:** Retrieves top lists (ships, systems, or regions) related to a specific character's activity in the last 7 days.

**Parameters:**
*   **Path Parameters:**
    *   `{id}`: The ID of the character.
*   **Query Parameters:**
    *   `type`: (Required) The type of top list to retrieve. Must be one of: `ships`, `systems`, `regions`.
*   **Body Parameters:** None

**Example Request (Conceptual):**
```typescript
// const characterId = 90000001;
// Get top ships for the character
// const topShipsData = await $fetch(`/api/characters/${characterId}/top?type=ships`);

// Get top systems for the character
// const topSystemsData = await $fetch(`/api/characters/${characterId}/top?type=systems`);

// Get top regions for the character
// const topRegionsData = await $fetch(`/api/characters/${characterId}/top?type=regions`);
```

**Example Response (Conceptual - structure varies by type):**
```json
// Example for type=ships
[
  { "ship_type_id": 587, "name": "Rifter", "count": 25 },
  { "ship_type_id": 621, "name": "Caracal", "count": 15 }
  // ... up to 10 ships
]

// Example for type=systems
[
  { "system_id": 30000142, "name": "Jita", "count": 100 },
  { "system_id": 30002187, "name": "Amarr", "count": 80 }
  // ... up to 10 systems
]

// Example for type=regions
[
  { "region_id": 10000002, "name": "The Forge", "count": 200 },
  { "region_id": 10000043, "name": "Domain", "count": 150 }
  // ... up to 10 regions
]

// Or if ID or type not provided:
// { "error": "Character ID not provided" }
// { "error": "Type not provided" }
```
