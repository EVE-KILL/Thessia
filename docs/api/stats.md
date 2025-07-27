# Stats API

## `GET /api/stats`

**Description:** Retrieves various top lists and statistical data based on the `type` query parameter. This endpoint serves as a gateway to different helper functions defined in `server/helpers/TopLists.ts`.

**Parameters:**
*   **Path Parameters:** None
*   **Query Parameters:**
    *   `type`: (Required) String, specifies the type of stats to retrieve. Valid types are:
        *   `characters`: Top characters.
        *   `corporations`: Top corporations.
        *   `alliances`: Top alliances.
        *   `solarsystems`: Top solar systems.
        *   `constellations`: Top constellations.
        *   `regions`: Top regions.
        *   `ships`: Top ships involved in kills.
        *   `solo`: Top solo PvP characters.
        *   `most_valuable_kills`: Most valuable killmails.
        *   `most_valuable_structures`: Most valuable structure kills.
        *   `most_valuable_ships`: Most valuable ship kills (distinct from `ships` which is general involvement).
        *   `kill_count`: Total kill count over a period.
        *   `new_characters`: Recently created characters found in killmails.
    *   `days`: (Optional) Integer, the number of past days to consider for the stats (default: 7). Not all `type` options might use this.
    *   `limit`: (Optional) Integer, the number of items to return for top lists (default: 10). Not all `type` options might use this.
*   **Body Parameters:** None

**Example Request (Conceptual):**
```typescript
// Get top 5 alliances over the last 30 days
// const topAlliances = await $fetch('/api/stats?dataType=alliances&days=30&limit=5');

// Get most valuable kills over the last 7 days (default days, default limit)
// const mvKills = await $fetch('/api/stats?dataType=most_valuable_kills');

// Get total kill count for the last 1 day
// const dailyKills = await $fetch('/api/stats?dataType=kill_count&days=1');
```

**Example Response (Conceptual - Varies greatly by `type`):**

*   **For `dataType=alliances` (example):**
    ```json
    [
      { "alliance_id": 99000001, "name": "Alliance A", "killCount": 500, "efficiency": 75.5, /* ...other fields from topAlliances helper... */ },
      { "alliance_id": 99000002, "name": "Alliance B", "killCount": 450, "efficiency": 60.0, /* ... */ }
      // ... up to 'limit' alliances
    ]
    ```

*   **For `dataType=most_valuable_kills` (example):**
    ```json
    [
      { "killmail_id": 123456789, "total_value": 50000000000, "kill_time": "2023-10-27T10:00:00Z", /* ...other fields from mostValuableKills helper... */ },
      { "killmail_id": 987654321, "total_value": 45000000000, "kill_time": "2023-10-26T15:00:00Z", /* ... */ }
      // ... up to 'limit' killmails
    ]
    ```

*   **For `dataType=kill_count` (example):**
    ```json
    {
      "count": 150234 // Total kills in the specified 'days'
    }
    ```

*   **For `type=new_characters` (example):**
    ```json
    [
      { "character_id": 90000100, "name": "New Pilot Alpha", "corporation_id": 98000100, /* ...other fields from newCharacters helper... */ },
      { "character_id": 90000101, "name": "New Pilot Bravo", "corporation_id": 98000101, /* ... */ }
    ]
    ```

**Example Response (Conceptual - Error):**
```json
// If 'type' is invalid or not provided
{
  "error": "Invalid type provided: some_invalid_type",
  "types": [
    "characters",
    "corporations",
    "alliances",
    // ... list of all valid types
  ]
}

// If an internal error occurs while fetching data for a valid type
{
  "error": "Failed to fetch data",
  "message": "Specific error message from the helper function or database"
}
```

**Note:** The actual structure of the successful response depends entirely on the specific helper function called based on the `type` parameter. Refer to the `server/helpers/TopLists.ts` file for the implementation details of each stat type.
