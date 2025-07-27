# Corporations API

## `GET /api/corporations/count`

**Description:** Returns the estimated total number of corporations in the database.

**Parameters:**
*   **Path Parameters:** None
*   **Query Parameters:** None
*   **Body Parameters:** None

**Example Request (Conceptual):**
```typescript
// const data = await $fetch('/api/corporations/count');
```

**Example Response (Conceptual):**
```json
{
  "count": 123456
}
```

## `GET /api/corporations`

**Description:** Returns a paginated list of all corporation IDs. Each page contains up to 100,000 corporation IDs.

**Parameters:**
*   **Path Parameters:** None
*   **Query Parameters:**
    *   `page`: (Optional) The page number to retrieve (default: 1).
*   **Body Parameters:** None

**Example Request (Conceptual):**
```typescript
// Get the first page of corporation IDs
// const dataPage1 = await $fetch('/api/corporations');

// Get the second page of corporation IDs
// const dataPage2 = await $fetch('/api/corporations?page=2');
```

**Example Response (Conceptual):**
```json
[
  98000001,
  98000002,
  // ... up to 100,000 corporation_ids
]
```

## `GET /api/corporations/{id}/alliancehistory`

**Description:** Retrieves the alliance history for a specific corporation. Each record includes the alliance details (ID, name) and the start and end dates of the corporation's membership in that alliance. The history is returned in reverse chronological order (most recent first).

**Parameters:**
*   **Path Parameters:**
    *   `{id}`: The ID of the corporation.
*   **Query Parameters:** None
*   **Body Parameters:** None

**Example Request (Conceptual):**
```typescript
// const corporationId = 98000001;
// const allianceHistory = await $fetch(`/api/corporations/${corporationId}/alliancehistory`);
```

**Example Response (Conceptual):**
```json
[
  {
    "record_id": 54321098, // ESI record ID
    "alliance_id": 99000002,
    "alliance_name": "Current Alliance",
    "start_date": "2023-01-01T00:00:00Z",
    "end_date": null // null if currently in this alliance
  },
  {
    "record_id": 54321097,
    "alliance_id": 99000001,
    "alliance_name": "Previous Alliance",
    "start_date": "2022-06-15T08:00:00Z",
    "end_date": "2023-01-01T00:00:00Z"
  },
  {
    "record_id": 54321096,
    "alliance_id": 0, // Represents being alliance-less
    "alliance_name": "",
    "start_date": "2022-03-01T12:00:00Z",
    "end_date": "2022-06-15T08:00:00Z"
  }
  // ... other history records
]
// Or if history is not found or empty:
// { "error": "Corporation history not found" }
```

## `GET /api/corporations/{id}/battles`

**Description:** Retrieves a paginated list of battles in which a specific corporation was involved.

**Parameters:**
*   **Path Parameters:**
    *   `{id}`: The ID of the corporation.
*   **Query Parameters:**
    *   `page`: (Optional) The page number to retrieve (default: 1).
    *   `limit`: (Optional) The number of battles per page (default: 20, min: 1, max: 100).
*   **Body Parameters:** None

**Example Request (Conceptual):**
```typescript
// const corporationId = 98000001;
// const battlesData = await $fetch(`/api/corporations/${corporationId}/battles?page=1&limit=10`);
```

**Example Response (Conceptual):**
```json
{
  "totalItems": 50,
  "totalPages": 5, // Assuming limit is 10
  "currentPage": 1,
  "itemsPerPage": 10,
  "battles": [
    {
      "battle_id": "unique_battle_id_2",
      "start_time": "2023-10-28T12:00:00Z",
      "end_time": "2023-10-28T13:30:00Z",
      "corporationsInvolved": [98000001, 98000005, /* ... */],
      // ... other battle details (structure similar to GET /api/battles/{id} but potentially summarized)
    }
    // ... other battles
  ]
}
```

## `GET /api/corporations/{id}`

**Description:** Retrieves detailed information about a specific corporation. This includes its ESI data, enriched with alliance name and faction name (if applicable) from the database.

**Parameters:**
*   **Path Parameters:**
    *   `{id}`: The ID of the corporation.
*   **Query Parameters:** None
*   **Body Parameters:** None

**Example Request (Conceptual):**
```typescript
// const corporationId = 98000001;
// const corporationData = await $fetch(`/api/corporations/${corporationId}`);
```

**Example Response (Conceptual):**
```json
{
  "corporation_id": 98000001,
  "name": "Brave Newbies Inc.",
  "ticker": "-BNI-",
  "member_count": 5000,
  "ceo_id": 90000001,
  "alliance_id": 99000001,
  "faction_id": null, // or a faction ID like 500001
  "date_founded": "2013-01-23T00:00:00Z",
  "description": "A corporation for new players.",
  "tax_rate": 0.1,
  "url": "http://bravecollective.com",
  "war_eligible": true,
  // ... other fields from ESI corporation endpoint ...
  "alliance_name": "Brave Collective", // or null if not in an alliance
  "faction_name": null // or "Caldari State" if faction_id is present
}
// Or if corporation ID not provided:
// { "error": "Corporation ID not provided" }
```

## `GET /api/corporations/{id}/members`

**Description:** Retrieves a paginated list of character members belonging to a specific corporation.

**Parameters:**
*   **Path Parameters:**
    *   `{id}`: The ID of the corporation.
*   **Query Parameters:**
    *   `page`: (Optional) The page number to retrieve (default: 1).
    *   `limit`: (Optional) The number of members per page (default: 1000, min: 1, max: 1000).
*   **Body Parameters:** None

**Example Request (Conceptual):**
```typescript
// const corporationId = 98000001;
// const membersData = await $fetch(`/api/corporations/${corporationId}/members?page=1&limit=50`);
```

**Example Response (Conceptual):**
```json
{
  "members": [
    {
      "character_id": 90000001,
      "name": "Character Alpha"
    },
    {
      "character_id": 90000002,
      "name": "Character Bravo"
    }
    // ... other members
  ],
  "total": 1500, // Total members in the corporation
  "page": 1,
  "limit": 50,
  "pageCount": 30, // total / limit
  "count": 50 // Number of members in the current response
}
// Or if corporation ID not provided:
// { "error": "Corporation ID not provided" }
```

## `GET /api/corporations/{id}/shortstats`

**Description:** Retrieves a short statistical summary for a specific corporation. This can be for all time or a specified number of past days. If stats are not found, empty stats are returned.

**Parameters:**
*   **Path Parameters:**
    *   `{id}`: The ID of the corporation.
*   **Query Parameters:**
    *   `days`: (Optional) The number of past days to include in the stats (e.g., 7, 30). If 0 or not provided, stats for all time are returned.
*   **Body Parameters:** None

**Example Request (Conceptual):**
```typescript
// const corporationId = 98000001;
// Get all-time short stats
// const statsAllTime = await $fetch(`/api/corporations/${corporationId}/shortstats`);

// Get short stats for the last 30 days
// const stats30Days = await $fetch(`/api/corporations/${corporationId}/shortstats?days=30`);
```

**Example Response (Conceptual - structure based on `IStats`):**
```json
{
  "type": "corporation_id",
  "id": 98000001,
  "days": 0, // Or the number of days specified
  "killCount": 500,
  "lossCount": 100,
  "iskKilled": 50000000000, // 50 Billion ISK
  "iskLost": 10000000000,   // 10 Billion ISK
  "efficiency": 83.33,
  "shipsKilled": 400,
  "shipsLost": 80,
  "updatedAt": "2023-10-27T10:00:00Z"
  // Other fields from IStats if applicable, or defaults if empty stats are returned
}
// Or if corporation ID not provided (Status 400):
// { "statusCode": 400, "statusMessage": "Missing corporation id", ... }
```

## `GET /api/corporations/{id}/stats`

**Description:** Retrieves a statistical summary for a specific corporation. This can be for all time or a specified number of past days. If stats are not found, empty stats are returned. (Currently, this endpoint is identical to `shortstats`. It might be intended for more detailed stats in the future).

**Parameters:**
*   **Path Parameters:**
    *   `{id}`: The ID of the corporation.
*   **Query Parameters:**
    *   `days`: (Optional) The number of past days to include in the stats (e.g., 7, 30). If 0 or not provided, stats for all time are returned.
*   **Body Parameters:** None

**Example Request (Conceptual):**
```typescript
// const corporationId = 98000001;
// Get all-time stats
// const statsAllTime = await $fetch(`/api/corporations/${corporationId}/stats`);

// Get stats for the last 30 days
// const stats30Days = await $fetch(`/api/corporations/${corporationId}/stats?days=30`);
```

**Example Response (Conceptual - structure based on `IStats`):**
```json
{
  "type": "corporation_id",
  "id": 98000001,
  "days": 0, // Or the number of days specified
  "killCount": 500,
  "lossCount": 100,
  "iskKilled": 50000000000, // 50 Billion ISK
  "iskLost": 10000000000,   // 10 Billion ISK
  "efficiency": 83.33,
  "shipsKilled": 400,
  "shipsLost": 80,
  "updatedAt": "2023-10-27T10:00:00Z"
  // Other fields from IStats if applicable, or defaults if empty stats are returned
}
// Or if corporation ID not provided:
// { "error": "Corporation ID not provided" }
```

## `GET /api/corporations/{id}/top`

**Description:** Retrieves top lists (ships, systems, or regions) related to a specific corporation's activity in the last 7 days.

**Parameters:**
*   **Path Parameters:**
    *   `{id}`: The ID of the corporation.
*   **Query Parameters:**
    *   `type`: (Required) The type of top list to retrieve. Must be one of: `ships`, `systems`, `regions`.
*   **Body Parameters:** None

**Example Request (Conceptual):**
```typescript
// const corporationId = 98000001;
// Get top ships for the corporation
// const topShipsData = await $fetch(`/api/corporations/${corporationId}/top?type=ships`);

// Get top systems for the corporation
// const topSystemsData = await $fetch(`/api/corporations/${corporationId}/top?type=systems`);

// Get top regions for the corporation
// const topRegionsData = await $fetch(`/api/corporations/${corporationId}/top?type=regions`);
```

**Example Response (Conceptual - structure varies by type):**
```json
// Example for type=ships
[
  { "ship_type_id": 33472, "name": "Praxis", "count": 50 },
  { "ship_type_id": 17738, "name": "Dominix", "count": 30 }
  // ... up to 10 ships
]

// Example for type=systems
[
  { "system_id": 30000142, "name": "Jita", "count": 200 },
  { "system_id": 30002053, "name": "Hek", "count": 150 }
  // ... up to 10 systems
]

// Example for type=regions
[
  { "region_id": 10000002, "name": "The Forge", "count": 500 },
  { "region_id": 10000032, "name": "Heimatar", "count": 400 }
  // ... up to 10 regions
]

// Or if ID or type not provided (Status 400):
// { "statusCode": 400, "statusMessage": "Corporation ID not provided", ... }
// { "statusCode": 400, "statusMessage": "Type not provided", ... }
```
