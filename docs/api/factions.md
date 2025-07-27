# Factions API

## `GET /api/factions/count`

**Description:** Returns the estimated total number of factions in the database.

**Parameters:**
*   **Path Parameters:** None
*   **Query Parameters:** None
*   **Body Parameters:** None

**Example Request (Conceptual):**
```typescript
// const data = await $fetch('/api/factions/count');
```

**Example Response (Conceptual):**
```json
{
  "count": 24 // Example count
}
```

## `GET /api/factions`

**Description:** Returns a list of all faction IDs in the database.

**Parameters:**
*   **Path Parameters:** None
*   **Query Parameters:** None
*   **Body Parameters:** None

**Example Request (Conceptual):**
```typescript
// const factionIds = await $fetch('/api/factions');
```

**Example Response (Conceptual):**
```json
[
  500001, // Caldari State
  500002, // Minmatar Republic
  500003, // Amarr Empire
  500004, // Gallente Federation
  // ... other faction_ids
]
```

## `GET /api/factions/{id}`

**Description:** Retrieves detailed information about a specific faction from the database.

**Parameters:**
*   **Path Parameters:**
    *   `{id}`: The ID of the faction.
*   **Query Parameters:** None
*   **Body Parameters:** None

**Example Request (Conceptual):**
```typescript
// const factionId = 500001; // Caldari State
// const factionData = await $fetch(`/api/factions/${factionId}`);
```

**Example Response (Conceptual - structure based on `IFaction`):**
```json
{
  "faction_id": 500001,
  "name": { "en": "Caldari State", "de": "Caldari-Staat", /* ... other languages */ },
  "description": { "en": "The Caldari State is one of the four major empires...", /* ... */ },
  "solar_system_id": 30000142, // Example: Jita (though this is usually HQ system, not directly on faction data from ESI)
  "corporation_id": 1000035, // Example: Caldari Navy
  "militia_corporation_id": 1000180, // Example: State Protectorate
  "size_factor": 5.0,
  "station_count": 500,
  "station_system_count": 200,
  "is_unique": true
  // ... other fields from IFaction
}
// Or if faction ID not provided:
// { "error": "Faction ID not provided" }
// If faction not found by getFaction helper, it might return null or throw an error handled by the helper.
```
