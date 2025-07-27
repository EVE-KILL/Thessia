# Alliances API

## `GET /api/alliances/count`

**Description:** Returns the estimated number of alliances.

**Parameters:**
*   **Path Parameters:** None
*   **Query Parameters:** None
*   **Body Parameters:** None

**Example Request (Conceptual):**
```typescript
// const data = await $fetch('/api/alliances/count');
```

**Example Response (Conceptual):**
```json
{
  "count": 12345
}

## `GET /api/alliances`

**Description:** Returns a list of all alliance IDs.

**Parameters:**
*   **Path Parameters:** None
*   **Query Parameters:** None
*   **Body Parameters:** None

**Example Request (Conceptual):**
```typescript
// const data = await $fetch('/api/alliances');
```

**Example Response (Conceptual):**
```json
[
  99000001,
  99000002,
  // ... other alliance_ids
]
```

## `GET /api/alliances/{id}/battles`

**Description:** Retrieves a paginated list of battles involving a specific alliance.

**Parameters:**
*   **Path Parameters:**
    *   `{id}`: The ID of the alliance.
*   **Query Parameters:**
    *   `page`: (Optional) The page number to retrieve (default: 1).
    *   `limit`: (Optional) The number of battles per page (default: 20, min: 1, max: 100).
*   **Body Parameters:** None

**Example Request (Conceptual):**
```typescript
// const data = await $fetch('/api/alliances/99000001/battles?page=2&limit=10');
```

**Example Response (Conceptual):**
```json
{
  "totalItems": 50,
  "totalPages": 5,
  "currentPage": 2,
  "itemsPerPage": 10,
  "battles": [
    {
      "battle_id": "unique_battle_identifier_1",
      "start_time": "2023-01-15T10:00:00Z",
      "end_time": "2023-01-15T12:00:00Z",
      "alliancesInvolved": [99000001, 99000002],
      // ... other battle details
    }
    // ... other battles
  ]
}
```

## `GET /api/alliances/{id}/coalition`

**Description:** Identifies potential coalition partners for a given alliance based on shared killmail activity over the last 90 days. It returns the top 10 alliances most frequently found attacking the same victims, excluding those who are also frequently victims of the given alliance.

**Parameters:**
*   **Path Parameters:**
    *   `{id}`: The ID of the alliance to find coalition partners for.
*   **Query Parameters:** None
*   **Body Parameters:** None

**Example Request (Conceptual):**
```typescript
// const data = await $fetch('/api/alliances/99000001/coalition');
```

**Example Response (Conceptual):**
```json
[
  {
    "alliance_id": 99000002,
    "name": "Coalition Partner A"
  },
  {
    "alliance_id": 99000003,
    "name": "Coalition Partner B"
  }
  // ... up to 10 alliances
]
```

## `GET /api/alliances/{id}/corporations`

**Description:** Retrieves a paginated list of corporations belonging to a specific alliance.

**Parameters:**
*   **Path Parameters:**
    *   `{id}`: The ID of the alliance.
*   **Query Parameters:**
    *   `page`: (Optional) The page number to retrieve (default: 1).
    *   `limit`: (Optional) The number of corporations per page (default: 1000, min: 1, max: 1000).
*   **Body Parameters:** None

**Example Request (Conceptual):**
```typescript
// const data = await $fetch('/api/alliances/99000001/corporations?page=1&limit=50');
```

**Example Response (Conceptual):**
```json
{
  "corporations": [
    {
      "corporation_id": 98000001,
      "name": "Corporation Alpha"
    },
    {
      "corporation_id": 98000002,
      "name": "Corporation Bravo"
    }
    // ... other corporations
  ],
  "total": 150,
  "page": 1,
  "limit": 50,
  "pageCount": 3,
  "count": 50
}
```

## `GET /api/alliances/{id}`

**Description:** Retrieves detailed information about a specific alliance, including its corporation count, member count, and faction name if applicable.

**Parameters:**
*   **Path Parameters:**
    *   `{id}`: The ID of the alliance.
*   **Query Parameters:** None
*   **Body Parameters:** None

**Example Request (Conceptual):**
```typescript
// const data = await $fetch('/api/alliances/99000001');
```

**Example Response (Conceptual):**
```json
{
  "alliance_id": 99000001,
  "name": "Brave Collective",
  "ticker": "-BNI-",
  "date_founded": "2013-01-23T00:00:00Z",
  "creator_corporation_id": 98000001,
  "creator_id": 90000001,
  "executor_corporation_id": 98000002,
  "faction_id": 500001, // Example faction ID
  "corporation_count": 50,
  "member_count": 5000,
  "faction_name": "Caldari State" // Example faction name
  // ... other alliance details from ESI
}
```

## `GET /api/alliances/{id}/members`

**Description:** Retrieves a paginated list of character members belonging to a specific alliance.

**Parameters:**
*   **Path Parameters:**
    *   `{id}`: The ID of the alliance.
*   **Query Parameters:**
    *   `page`: (Optional) The page number to retrieve (default: 1).
    *   `limit`: (Optional) The number of members per page (default: 1000, min: 1, max: 1000).
*   **Body Parameters:** None

**Example Request (Conceptual):**
```typescript
// const data = await $fetch('/api/alliances/99000001/members?page=1&limit=50');
```

**Example Response (Conceptual):**
```json
{
  "members": [
    {
      "character_id": 90000001,
      "name": "Character One"
    },
    {
      "character_id": 90000002,
      "name": "Character Two"
    }
    // ... other members
  ],
  "total": 5000,
  "page": 1,
  "limit": 50,
  "pageCount": 100,
  "count": 50
}
```

## `GET /api/alliances/{id}/shortstats`

**Description:** Retrieves short statistical summary for a specific alliance. This can be for all time or a specified number of days.

**Parameters:**
*   **Path Parameters:**
    *   `{id}`: The ID of the alliance.
*   **Query Parameters:**
    *   `days`: (Optional) The number of past days to include in the stats (e.g., 7, 30). If 0 or not provided, stats for all time are returned.
*   **Body Parameters:** None

**Example Request (Conceptual):**
```typescript
// Get all-time stats
// const dataAllTime = await $fetch('/api/alliances/99000001/shortstats');

// Get stats for the last 30 days
// const data30Days = await $fetch('/api/alliances/99000001/shortstats?days=30');
```

**Example Response (Conceptual - structure based on `IStats`):**
```json
{
  "type": "alliance_id",
  "id": 99000001,
  "days": 0, // Or the number of days specified
  "killCount": 1500,
  "lossCount": 300,
  "iskKilled": 100000000000, // 100 Billion ISK
  "iskLost": 20000000000,   // 20 Billion ISK
  "efficiency": 83.33, // (iskKilled / (iskKilled + iskLost)) * 100
  "shipsKilled": 1200,
  "shipsLost": 250,
  "updatedAt": "2023-10-27T10:00:00Z"
  // Other fields from IStats if applicable
}
```

## `GET /api/alliances/{id}/stats`

**Description:** Retrieves statistical summary for a specific alliance. This can be for all time or a specified number of days. (Currently, this endpoint is identical to `shortstats`. It might be intended for more detailed stats in the future).

**Parameters:**
*   **Path Parameters:**
    *   `{id}`: The ID of the alliance.
*   **Query Parameters:**
    *   `days`: (Optional) The number of past days to include in the stats (e.g., 7, 30). If 0 or not provided, stats for all time are returned.
*   **Body Parameters:** None

**Example Request (Conceptual):**
```typescript
// Get all-time stats
// const dataAllTime = await $fetch('/api/alliances/99000001/stats');

// Get stats for the last 30 days
// const data30Days = await $fetch('/api/alliances/99000001/stats?days=30');
```

**Example Response (Conceptual - structure based on `IStats`):**
```json
{
  "type": "alliance_id",
  "id": 99000001,
  "days": 0, // Or the number of days specified
  "killCount": 1500,
  "lossCount": 300,
  "iskKilled": 100000000000, // 100 Billion ISK
  "iskLost": 20000000000,   // 20 Billion ISK
  "efficiency": 83.33, // (iskKilled / (iskKilled + iskLost)) * 100
  "shipsKilled": 1200,
  "shipsLost": 250,
  "updatedAt": "2023-10-27T10:00:00Z"
  // Other fields from IStats if applicable
}
```

## `GET /api/alliances/{id}/top`

**Description:** Retrieves top lists (ships, systems, or regions) related to an alliance's activity in the last 7 days.

**Parameters:**
*   **Path Parameters:**
    *   `{id}`: The ID of the alliance.
*   **Query Parameters:**
    *   `type`: (Required) The type of top list to retrieve. Must be one of: `ships`, `systems`, `regions`.
*   **Body Parameters:** None

**Example Request (Conceptual):**
```typescript
// Get top ships for the alliance
// const topShipsData = await $fetch('/api/alliances/99000001/top?type=ships');

// Get top systems for the alliance
// const topSystemsData = await $fetch('/api/alliances/99000001/top?type=systems');

// Get top regions for the alliance
// const topRegionsData = await $fetch('/api/alliances/99000001/top?type=regions');
```

**Example Response (Conceptual - structure varies by type):**
```json
// Example for type=ships
[
  { "ship_type_id": 670, "name": "Capsule", "count": 150 },
  { "ship_type_id": 33472, "name": "Praxis", "count": 120 }
  // ... up to 10 ships
]

// Example for type=systems
[
  { "system_id": 30000142, "name": "Jita", "count": 500 },
  { "system_id": 30002187, "name": "Amarr", "count": 450 }
  // ... up to 10 systems
]

// Example for type=regions
[
  { "region_id": 10000002, "name": "The Forge", "count": 1200 },
  { "region_id": 10000043, "name": "Domain", "count": 1100 }
  // ... up to 10 regions
]
```
