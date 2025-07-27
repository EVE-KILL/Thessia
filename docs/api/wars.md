# Wars API

## `GET /api/wars`

**Description:** Retrieves a paginated list of all war IDs from the database. Each page contains up to 100,000 war IDs.

**Parameters:**
*   **Path Parameters:** None
*   **Query Parameters:**
    *   `page`: (Optional) Integer, the page number to retrieve (default: 1).
*   **Body Parameters:** None

**Example Request (Conceptual):**
```typescript
// Get the first page of war IDs
// const warIdsPage1 = await $fetch('/api/wars');

// Get the second page of war IDs
// const warIdsPage2 = await $fetch('/api/wars?page=2');
```

**Example Response (Conceptual):**
```json
[
  123456,
  123457,
  123458,
  // ... up to 100,000 war IDs for the current page
]
// If no wars are found for the page (e.g., page number is too high),
// an empty array [] is returned.
```

**Error Handling:**
*   If `page` is not a valid number, it defaults to `1`.
*   The endpoint is cached.

## `GET /api/wars/{id}`

**Description:** Retrieves detailed information about a specific war by its ID.

**Parameters:**
*   **Path Parameters:**
    *   `{id}`: (Required) The ID of the war.
*   **Query Parameters:** None
*   **Body Parameters:** None

**Example Request (Conceptual):**
```typescript
// const warId = 123456;
// const warData = await $fetch(`/api/wars/${warId}`);
```

**Example Response (Conceptual - Structure based on `IWar`):**
```json
{
  "war_id": 123456,
  "aggressor": {
    "alliance_id": 99000001,
    "corporation_id": null, // or corporation_id if aggressor is a corp
    "isk_destroyed": 15000000000,
    "ships_killed": 120
  },
  "defender": {
    "alliance_id": 99000002,
    "corporation_id": null, // or corporation_id if defender is a corp
    "isk_destroyed": 10000000000,
    "ships_killed": 90
  },
  "declared": "2023-01-15T10:00:00Z",
  "started": "2023-01-16T10:00:00Z",
  "finished": "2023-02-15T10:00:00Z", // Can be null if war is ongoing
  "retracted": null, // Can be a date if war was retracted
  "mutual": false,
  "open_for_allies": true,
  "allies": [
    {
      "alliance_id": 99000003,
      "corporation_id": null
    }
    // ... other allies
  ],
  "killmail_count": 210, // Total killmails associated with this war
  "last_checked_killmails": "2023-02-16T00:00:00Z", // When killmails for this war were last checked/updated
  "updatedAt": "2023-02-16T00:05:00Z",
  "createdAt": "2023-01-15T10:05:00Z"
}
// If the war ID is not found, it returns null.
// If 'id' is not provided or invalid, H3 might throw an error before DB lookup.
```

## `GET /api/wars/{id}/killmails`

**Description:** Retrieves a list of all killmail IDs and their ESI hashes associated with a specific war ID.

**Parameters:**
*   **Path Parameters:**
    *   `{id}`: (Required) The ID of the war.
*   **Query Parameters:** None
*   **Body Parameters:** None

**Example Request (Conceptual):**
```typescript
// const warId = 123456;
// const warKillmails = await $fetch(`/api/wars/${warId}/killmails`);
```

**Example Response (Conceptual):**
```json
[
  {
    "killmail_id": 102938475,
    "killmail_hash": "a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0"
  },
  {
    "killmail_id": 102938476,
    "killmail_hash": "b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1"
  }
  // ... other killmail_id and killmail_hash pairs for the war
]
// If the war ID is not found or has no associated killmails,
// an empty array [] is returned.
// If 'id' is not provided or invalid, H3 might throw an error.
```
