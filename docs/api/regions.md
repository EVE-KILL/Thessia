# Regions API

## `GET /api/regions/{id}/battles`

**Description:** Retrieves a paginated list of battles that occurred in a specific region.

**Parameters:**
*   **Path Parameters:**
    *   `{id}`: (Required) The ID of the region.
*   **Query Parameters:**
    *   `page`: (Optional) Integer, the page number to retrieve (default: 1).
    *   `limit`: (Optional) Integer, the number of battles per page (default: 20, min: 1, max: 100).
*   **Body Parameters:** None

**Example Request (Conceptual):**
```typescript
// const regionId = 10000002; // The Forge
// Get page 1 with 10 battles for The Forge
// const battlesData = await $fetch(`/api/regions/${regionId}/battles?page=1&limit=10`);
```

**Example Response (Conceptual):**
```json
{
  "totalItems": 150, // Total battles found in this region
  "totalPages": 15,  // Assuming limit is 10
  "currentPage": 1,
  "itemsPerPage": 10,
  "battles": [
    {
      "battle_id": "unique_battle_id_region_1",
      "start_time": "2023-10-28T10:00:00Z",
      "end_time": "2023-10-28T11:30:00Z",
      "region_id": 10000002,
      "systemsInvolved": [30000142, 30000144 /* ... */],
      // ... other battle details (structure similar to GET /api/battles/{id} but potentially summarized)
    },
    {
      "battle_id": "unique_battle_id_region_2",
      "start_time": "2023-10-27T18:00:00Z",
      "end_time": "2023-10-27T19:00:00Z",
      "region_id": 10000002,
      "systemsInvolved": [30000142 /* ... */],
      // ... other battle details
    }
    // ... other battles for the current page
  ]
}
```

**Example Response (Conceptual - Error):**
```json
// If region ID is invalid or not provided
// Status: 400
{
  "statusCode": 400,
  "statusMessage": "Invalid region id"
}

// If page number is invalid
// Status: 400
{
  "statusCode": 400,
  "statusMessage": "Invalid page number"
}

// If limit value is invalid
// Status: 400
{
  "statusCode": 400,
  "statusMessage": "Invalid limit value (must be between 1 and 100)"
}

// If an internal server error occurs
// Status: 500
{
  "statusCode": 500,
  "statusMessage": "Internal Server Error fetching region battles"
}
```

## `GET /api/regions/{id}`

**Description:** Retrieves detailed information about a specific region, either by its numerical ID or by its English name (case-insensitive).

**Parameters:**
*   **Path Parameters:**
    *   `{id}`: (Required) The numerical ID of the region or its English name (URL-encoded if it contains special characters).
*   **Query Parameters:** None
*   **Body Parameters:** None

**Example Request (Conceptual):**
```typescript
// By numerical ID
// const regionId = 10000002;
// const regionDataById = await $fetch(`/api/regions/${regionId}`);

// By English name
// const regionName = "The Forge";
// const regionDataByName = await $fetch(`/api/regions/${encodeURIComponent(regionName)}`);

// By English name (case-insensitive)
// const regionNameLower = "the forge";
// const regionDataByNameLower = await $fetch(`/api/regions/${encodeURIComponent(regionNameLower)}`);
```

**Example Response (Conceptual - Success):**
```json
// Structure based on IRegion interface
{
  "region_id": 10000002,
  "name": {
    "en": "The Forge",
    "de": "Die Schmiede",
    "fr": "La Forge",
    "ja": "ザ・フォージ",
    "ru": "The Forge",
    "zh": "铸炉星域",
    "ko": "더 포지"
  },
  "description": {
    "en": "The Forge is a heavily industrialized region...",
    // ... other languages
  },
  "constellations": [20000001, 20000002, /* ... other constellation IDs in this region ... */]
  // Other fields from the IRegion interface might be present
}
```

**Example Response (Conceptual - Error):**
```json
// If region identifier is missing
// Status: 400
{
  "statusCode": 400,
  "statusMessage": "Missing region identifier"
}

// If region with the given ID is not found
// Status: 404
{
  "statusCode": 404,
  "statusMessage": "Region with ID 12345678 not found"
}

// If region with the given name is not found
// Status: 404
{
  "statusCode": 404,
  "statusMessage": "Region with name \"Non Existent Region\" not found"
}
```
