# Killmails API

## `POST /api/killmail/batch`

**Description:** Retrieves multiple killmails by their IDs in a single request.

**Parameters:**
*   **Path Parameters:** None
*   **Query Parameters:** None
*   **Body Parameters:**
    *   `ids`: (Required) An array of killmail IDs (integers).

**Example Request (Conceptual):**
```typescript
// const killmailIdsToFetch = [123456789, 987654321, 112233445];
// const killmailsData = await $fetch('/api/killmail/batch', {
//   method: 'POST',
//   body: { ids: killmailIdsToFetch }
// });
```

**Example Response (Conceptual - Success):**
```json
[
  {
    "killmail_id": 123456789,
    "killmail_time": "2023-10-27T10:00:00Z",
    "solar_system_id": 30000142,
    // ... other killmail fields (full IKillmail structure)
  },
  {
    "killmail_id": 987654321,
    "killmail_time": "2023-10-27T10:05:00Z",
    "solar_system_id": 30002187,
    // ... other killmail fields
  }
  // ... other requested killmails found in the database
  // Note: The order might not strictly match the input 'ids' array.
]
```

**Example Response (Conceptual - Error):**
```json
// If 'ids' is not an array or contains non-numeric values
// Status: 400
{
  "statusCode": 400,
  "statusMessage": "Invalid request body. Expected an array of killmail IDs."
  // ... other error details
}

// If an internal server error occurs
// Status: 500
{
  "statusCode": 500,
  "statusMessage": "Error fetching killmails."
  // ... other error details
}
```

## `GET /api/killmail/count`

**Description:** Returns the estimated total number of killmails in the database.

**Parameters:**
*   **Path Parameters:** None
*   **Query Parameters:** None
*   **Body Parameters:** None

**Example Request (Conceptual):**
```typescript
// const data = await $fetch('/api/killmail/count');
```

**Example Response (Conceptual):**
```json
{
  "count": 25000000 // Example count
}
```

## `POST /api/killmail`

**Description:** Submits a new killmail (via its ESI ID and hash) to be fetched from ESI, parsed, and saved to the database. It checks if the killmail already exists before processing.

**Parameters:**
*   **Path Parameters:** None
*   **Query Parameters:** None
*   **Body Parameters:**
    *   `killmail_id`: (Required) Integer, the ESI ID of the killmail.
    *   `killmail_hash`: (Required) String, the ESI hash of the killmail.

**Example Request (Conceptual):**
```typescript
// const newKillmailData = {
//   killmail_id: 102938475,
//   killmail_hash: "a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0"
// };

// const response = await $fetch('/api/killmail', {
//   method: 'POST',
//   body: newKillmailData
// });
```

**Example Response (Conceptual - Success):**
```json
{
  "success": "Killmail saved",
  "esi": { /* The raw ESI killmail data */ },
  "killmail": { /* The parsed and processed killmail data (IKillmail structure) */ }
}
```

**Example Response (Conceptual - Error):**
```json
// If killmail_id or killmail_hash is missing or invalid
{
  "error": "killmail_id is missing or not a number" // or "killmail_hash is missing or not a string"
}

// If killmail already exists in the database
{
  "error": "Killmail already exists"
}

// If ESI fetch fails
{
  "error": "Error fetching killmail from ESI",
  "esiError": "ESI error message if available" // E.g., "Not found" or "Invalid hash"
}

// If parsing fails
{
  "error": "Error parsing killmail"
}
```

## `GET /api/killmail/latest`

**Description:** Retrieves the latest 10,000 killmails from the database, sorted by their creation date (when they were added to the database) in descending order. Returns an object mapping killmail IDs to their ESI hashes.

**Parameters:**
*   **Path Parameters:** None
*   **Query Parameters:** None
*   **Body Parameters:** None

**Example Request (Conceptual):**
```typescript
// const latestKills = await $fetch('/api/killmail/latest');
```

**Example Response (Conceptual):**
```json
{
  "102938475": "a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0",
  "102938474": "f0e1d2c3b4a5f6e7d8c9b0a1f2e3d4c5b6a7f8e9",
  // ... up to 10,000 entries
}
```

## `GET /api/killmail/nearCelestial`

**Description:** Finds killmails that occurred near a specific celestial object (e.g., a gate, station, planet) within a given distance and time frame. Returns up to 10 killmails, sorted by distance (furthest first within the limit).

**Parameters:**
*   **Path Parameters:** None
*   **Query Parameters:**
    *   `celestial_id`: (Required) Integer, the ID of the celestial object.
    *   `distanceInMeters`: (Required) Integer, the maximum distance from the celestial object in meters.
    *   `days`: (Optional) Integer, the number of past days to search within (default: 1).
*   **Body Parameters:** None

**Example Request (Conceptual):**
```typescript
// Find killmails within 50km of Jita IV - Moon 4 - Caldari Navy Assembly Plant (celestial_id 60003760) in the last 24 hours
// const nearbyKills = await $fetch('/api/killmail/nearCelestial?celestial_id=60003760&distanceInMeters=50000');

// Find killmails within 100km of Stargate (Amarr) (celestial_id 50000056) in the last 7 days
// const nearbyKills7Days = await $fetch('/api/killmail/nearCelestial?celestial_id=50000056&distanceInMeters=100000&days=7');
```

**Example Response (Conceptual - Success):**
```json
[
  {
    "_id": "mongodb_object_id_of_killmail_1", // Internal MongoDB ID
    "killmail_id": 102938400,
    "distance": 48500.75 // Calculated distance in meters
  },
  {
    "_id": "mongodb_object_id_of_killmail_2",
    "killmail_id": 102938405,
    "distance": 35200.10
  }
  // ... up to 10 killmails, sorted by distance descending
]
```

**Example Response (Conceptual - Error):**
```json
// If celestial_id is not found
{
  "error": "Celestial not found"
}

// If required parameters are missing or invalid, H3 might throw a 400/500 error before this custom error.
// The endpoint itself doesn't explicitly check for missing celestial_id or distanceInMeters in query before parsing.
```

## `GET /api/killmail/nearCoordinates`

**Description:** Finds killmails that occurred near a specific set of 3D coordinates (x, y, z) within a given solar system, distance, and time frame. Returns a limited number of killmails (default 10, max 50), sorted by distance (closest first). This endpoint is computationally more intensive and uses a spatial index for optimization.

**Parameters:**
*   **Path Parameters:** None
*   **Query Parameters:**
    *   `system_id`: (Required) Integer, the ID of the solar system to search within.
    *   `x`: (Required) Float, the X coordinate.
    *   `y`: (Required) Float, the Y coordinate.
    *   `z`: (Required) Float, the Z coordinate.
    *   `distanceInMeters`: (Required) Integer, the maximum spherical distance from the coordinates in meters.
    *   `days`: (Optional) Integer, the number of past days to search within (default: 1).
    *   `limit`: (Optional) Integer, the maximum number of killmails to return (default: 10, max: 50).
*   **Body Parameters:** None

**Example Request (Conceptual):**
```typescript
// Find killmails within 20km of specific coordinates in Jita (system_id 30000142) in the last 24 hours, limit 5
// const nearbyKills = await $fetch(
//   '/api/killmail/nearCoordinates?system_id=30000142&x=10000000000&y=-20000000000&z=30000000000&distanceInMeters=20000&limit=5'
// );

// Find killmails within 100km in Amarr (system_id 30002187) in the last 3 days
// const nearbyKills3Days = await $fetch(
//   '/api/killmail/nearCoordinates?system_id=30002187&x=0&y=0&z=0&distanceInMeters=100000&days=3'
// );
```

**Example Response (Conceptual - Success with results):**
```json
{
  "results": [
    {
      "killmail_id": 102938500,
      "distance": 15234.56, // Calculated distance in meters
      "kill_time": "2023-10-27T11:05:00.000Z",
      "total_value": 75000000,
      "victim": {
        "ship_id": 587, // Rifter
        "ship_name": { "en": "Rifter", "de": "Rifter", /* ... */ }
      }
    },
    {
      "killmail_id": 102938502,
      "distance": 18999.01,
      "kill_time": "2023-10-27T11:02:00.000Z",
      "total_value": 12000000,
      "victim": {
        "ship_id": 670, // Capsule
        "ship_name": { "en": "Capsule", "de": "Kapsel", /* ... */ }
      }
    }
    // ... up to 'limit' killmails, sorted by distance ascending
  ],
  "count": 2 // Number of results returned
}
```

**Example Response (Conceptual - Success with no results):**
```json
{
  "results": [],
  "count": 0,
  "message": "No killmails found near these coordinates within the specified distance."
}
```

**Example Response (Conceptual - Error):**
```json
// If required parameters are missing
// Status: 400
{
  "statusCode": 400,
  "statusMessage": "Missing required parameters: system_id, x" // Example
  // ... other error details
}

// If parameters are not in the correct numeric format
// Status: 400
{
  "statusCode": 400,
  "statusMessage": "Invalid parameter format. Numeric values expected."
  // ... other error details
}

// If an internal server error occurs
// Status: 500
{
  "statusCode": 500,
  "statusMessage": "Error while searching for nearby killmails"
  // ... other error details
}
```

## `GET /api/killmail/{id}/esi`

**Description:** Retrieves the raw ESI data for a specific killmail ID from the `killmailsesi` collection in the database.

**Parameters:**
*   **Path Parameters:**
    *   `{id}`: (Required) The ESI ID of the killmail.
*   **Query Parameters:** None
*   **Body Parameters:** None

**Example Request (Conceptual):**
```typescript
// const killmailId = 102938475;
// const rawEsiData = await $fetch(`/api/killmail/${killmailId}/esi`);
```

**Example Response (Conceptual - Success):**
```json
// This will be the raw JSON structure as returned by the EVE ESI endpoint
// /killmails/{killmail_id}/{killmail_hash}/
// and stored in the KillmailsESI collection.
{
  "attackers": [
    {
      "character_id": 90000001,
      "corporation_id": 98000001,
      "damage_done": 1234,
      "final_blow": true,
      "security_status": 1.5,
      "ship_type_id": 587, // Rifter
      "weapon_type_id": 2456
    }
    // ... other attackers
  ],
  "killmail_id": 102938475,
  "killmail_time": "2023-10-27T10:00:00Z",
  "solar_system_id": 30000142,
  "victim": {
    "character_id": 90000002,
    "corporation_id": 98000002,
    "damage_taken": 1234,
    "items": [
      {
        "flag": 5,
        "item_type_id": 3520, // 1MN Afterburner I
        "quantity_destroyed": 1,
        "singleton": 0
      }
      // ... other items
    ],
    "position": {
      "x": 10000000000.0,
      "y": -20000000000.0,
      "z": 30000000000.0
    },
    "ship_type_id": 670 // Capsule
  },
  "war_id": null // or an integer if part of a war
}
// If the killmail ID is not found in the KillmailsESI collection, it returns null.
null
```

## `GET /api/killmail/{id}`

**Description:** Retrieves a single processed killmail by its ID from the `killmails` collection. Supports projection to fetch only specific fields.

**Parameters:**
*   **Path Parameters:**
    *   `{id}`: (Required) The ID of the killmail.
*   **Query Parameters:**
    *   `fields`: (Optional) A comma-separated string of field names to include in the response (e.g., `killmail_id,kill_time,victim.character_id`). If not provided, all fields are returned.
*   **Body Parameters:** None

**Example Request (Conceptual):**
```typescript
// Get full killmail details
// const killmailId = 102938475;
// const killmailData = await $fetch(`/api/killmail/${killmailId}`);

// Get only specific fields
// const partialKillmailData = await $fetch(`/api/killmail/${killmailId}?fields=killmail_id,total_value,victim.ship_id`);
```

**Example Response (Conceptual - Success, full data):**
```json
// This will be the full IKillmail structure as stored in the Killmails collection.
{
  "killmail_id": 102938475,
  "killmail_hash": "a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0",
  "kill_time": "2023-10-27T10:00:00Z",
  "system_id": 30000142,
  "system_name": "Jita",
  "region_id": 10000002,
  "region_name": { "en": "The Forge" },
  "total_value": 150000000,
  "points": 5,
  "is_npc": false,
  "is_solo": false,
  "war_id": null,
  "victim": {
    "character_id": 90000002,
    "character_name": "Victim Pilot",
    "corporation_id": 98000002,
    "corporation_name": "Victim Corp",
    "alliance_id": 99000002,
    "alliance_name": "Victim Alliance",
    "faction_id": null,
    "faction_name": null,
    "ship_id": 670,
    "ship_name": { "en": "Capsule" },
    "damage_taken": 1234,
    "items": [ /* ... IItem array ... */ ],
    "position_x": 10000000000.0,
    "position_y": -20000000000.0,
    "position_z": 30000000000.0
  },
  "attackers": [
    {
      "attacker_id": 1, // Internal sequential ID for this killmail
      "character_id": 90000001,
      "character_name": "Attacker Pilot",
      // ... other attacker fields (IAttacker structure)
      "final_blow": true
    }
    // ... other attackers
  ],
  "items": [ /* ... IItem array, denormalized for easier access ... */ ],
  "related_killmails": [], // Array of related killmail IDs
  "involved_parties": { /* ... IInvolvedParties structure ... */ },
  "createdAt": "2023-10-27T10:01:00Z", // When this record was created in DB
  "updatedAt": "2023-10-27T10:01:00Z"  // When this record was last updated
}
```

**Example Response (Conceptual - Success, with `fields` projection):**
```json
// For /api/killmail/102938475?fields=killmail_id,total_value,victim.ship_id
{
  "killmail_id": 102938475,
  "total_value": 150000000,
  "victim": {
    "ship_id": 670
  }
}
```

**Example Response (Conceptual - Error):**
```json
// If killmail_id is invalid
// Status: 400
{
  "statusCode": 400,
  "statusMessage": "Invalid killmail ID format"
  // ... other error details
}

// If killmail is not found
// Status: 404
{
  "statusCode": 404,
  "statusMessage": "Killmail not found"
  // ... other error details
}

// If an internal server error occurs
// Status: 500
{
  "statusCode": 500,
  "statusMessage": "Error retrieving killmail"
  // ... other error details
}
```

## `GET /api/killmail/{id}/sibling`

**Description:** Finds "sibling" killmails related to a given killmail ID. A sibling killmail is defined as a killmail where the same victim character lost a *different* ship (not a capsule) in the same system within a +/- 1-hour window of the original killmail's time. This is typically used to find the ship loss killmail when viewing a capsule (pod) loss.

**Parameters:**
*   **Path Parameters:**
    *   `{id}`: (Required) The ID of the killmail (usually a capsule loss) for which to find siblings.
*   **Query Parameters:** None
*   **Body Parameters:** None

**Example Request (Conceptual):**
```typescript
// const podKillmailId = 102938476; // Assume this is a capsule loss
// const siblingShipLoss = await $fetch(`/api/killmail/${podKillmailId}/sibling`);
```

**Example Response (Conceptual - Success):**
```json
[
  {
    "killmail_id": 102938475, // The ID of the sibling killmail (ship loss)
    "victim": {
      "ship_id": 587, // Rifter
      "ship_name": { "en": "Rifter", "de": "Rifter", /* ... */ }
    }
  }
  // Could be multiple if the character lost multiple non-capsule ships in that window.
  // Returns an empty array [] if no siblings are found or if the original killmail victim data is missing.
]
```

## `GET /api/killmail/history`

**Description:** Retrieves a historical count of killmails grouped by date (YYYY-MM-DD), sorted chronologically.

**Parameters:**
*   **Path Parameters:** None
*   **Query Parameters:** None
*   **Body Parameters:** None

**Example Request (Conceptual):**
```typescript
// const killmailHistoryCounts = await $fetch('/api/killmail/history');
```

**Example Response (Conceptual):**
```json
{
  "2023-01-01": 15000,
  "2023-01-02": 17500,
  "2023-01-03": 16200,
  // ... and so on for all dates with killmails
  "2023-10-27": 18000
}
```

## `GET /api/killmail/history/{date}`

**Description:** Retrieves all killmail IDs and their corresponding ESI hashes for a specific date (YYYY-MM-DD).

**Parameters:**
*   **Path Parameters:**
    *   `{date}`: (Required) The date for which to retrieve killmails, in YYYY-MM-DD format.
*   **Query Parameters:** None
*   **Body Parameters:** None

**Example Request (Conceptual):**
```typescript
// const date = "2023-10-27";
// const killmailsForDate = await $fetch(`/api/killmail/history/${date}`);
```

**Example Response (Conceptual):**
```json
{
  "102938475": "a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0",
  "102938476": "b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1",
  // ... all killmail_id: killmail_hash pairs for the specified date
}
// If the date format is invalid or no killmails exist for that date,
// it might return an empty object {} or an error depending on server-side date parsing.
// The current implementation will attempt to parse any string as a date.
```
