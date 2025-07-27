# Prices API

## `GET /api/prices/count`

**Description:** Returns the estimated total number of price records in the database.

**Parameters:**
*   **Path Parameters:** None
*   **Query Parameters:** None
*   **Body Parameters:** None

**Example Request (Conceptual):**
```typescript
// const data = await $fetch('/api/prices/count');
```

**Example Response (Conceptual):**
```json
{
  "count": 50000 // Example count of price records
}
```

## `GET /api/prices`

**Description:** Retrieves a count of price records grouped by date (YYYY-MM-DD), sorted in reverse chronological order (most recent date first).

**Parameters:**
*   **Path Parameters:** None
*   **Query Parameters:** None
*   **Body Parameters:** None

**Example Request (Conceptual):**
```typescript
// const priceCountsByDate = await $fetch('/api/prices');
```

**Example Response (Conceptual):**
```json
{
  "2023-10-27": 45000, // Number of price records for this date
  "2023-10-26": 44800,
  "2023-10-25": 45100,
  // ... and so on for all dates with price records
  "2023-01-01": 40000
}
```

## `GET /api/prices/region/{id}`

**Description:** Retrieves price data for a specific region. It can filter prices by a number of past days or by a specific date (Unix timestamp). If both `days` and `date` are provided, `date` takes precedence. If no date filter is provided, it defaults to the last 1 day.

**Parameters:**
*   **Path Parameters:**
    *   `{id}`: (Required) The ID of the region.
*   **Query Parameters:**
    *   `days`: (Optional) Integer, the number of past days to fetch prices for (e.g., 1, 7, 30). Defaults to 1 if `date` is not provided.
    *   `date`: (Optional) Integer, a Unix timestamp (in seconds). If provided, fetches prices on or after this specific date. The date is capped at "2003-10-01" if an earlier date is given.
*   **Body Parameters:** None

**Example Request (Conceptual):**
```typescript
// const regionId = 10000002; // The Forge

// Get prices for The Forge for the last 1 day (default)
// const pricesLastDay = await $fetch(`/api/prices/region/${regionId}`);

// Get prices for The Forge for the last 7 days
// const pricesLast7Days = await $fetch(`/api/prices/region/${regionId}?days=7`);

// Get prices for The Forge on and after a specific Unix timestamp (e.g., 1672531200 for 2023-01-01 00:00:00 UTC)
// const pricesFromDate = await $fetch(`/api/prices/region/${regionId}?date=1672531200`);
```

**Example Response (Conceptual - Array of `IPrice` objects):**
```json
[
  {
    "type_id": 34, // Tritanium
    "region_id": 10000002,
    "date": "2023-10-27T00:00:00.000Z",
    "average": 5.50,
    "highest": 5.80,
    "lowest": 5.20,
    "order_count": 150000,
    "volume": 1000000000
  },
  {
    "type_id": 35, // Pyerite
    "region_id": 10000002,
    "date": "2023-10-27T00:00:00.000Z",
    "average": 10.20,
    "highest": 10.50,
    "lowest": 9.90,
    "order_count": 120000,
    "volume": 800000000
  }
  // ... other price records for the specified region and date/days
]
// If no prices are found for the given criteria, an empty array [] is returned.
// If regionId is invalid or not found, it might also return an empty array or an error
// depending on how the database handles non-existent region_ids in queries.
```

## `GET /api/prices/type_id/{id}/buildPrice`

**Description:** Calculates the estimated build price for a given item type ID based on its blueprint materials and their market prices. It uses prices from region ID 10000002 (The Forge) by default. It can filter material prices by a number of past days or by a specific date (Unix timestamp). If both `days` and `date` are provided, `date` takes precedence. If no date filter is provided, it defaults to the last 1 day for material prices.

**Parameters:**
*   **Path Parameters:**
    *   `{id}`: (Required) The type ID of the item for which to calculate the build price.
*   **Query Parameters:**
    *   `days`: (Optional) Integer, the number of past days to consider for material prices (e.g., 1, 7, 30). Defaults to 1 if `date` is not provided.
    *   `date`: (Optional) Integer, a Unix timestamp (in seconds). If provided, uses material prices on or after this specific date. The date is capped at "2003-10-01" if an earlier date is given.
*   **Body Parameters:** None

**Example Request (Conceptual):**
```typescript
// const typeId = 587; // Rifter

// Get build price for Rifter using material prices from the last 1 day (default)
// const buildPriceLastDay = await $fetch(`/api/prices/type_id/${typeId}/buildPrice`);

// Get build price for Rifter using material prices from the last 7 days
// const buildPriceLast7Days = await $fetch(`/api/prices/type_id/${typeId}/buildPrice?days=7`);

// Get build price for Rifter using material prices on/after a specific Unix timestamp
// const buildPriceFromDate = await $fetch(`/api/prices/type_id/${typeId}/buildPrice?date=1672531200`);
```

**Example Response (Conceptual - from `getPriceFromBlueprint` helper):**
```json
// If the item has a blueprint and materials with prices are found
{
  "type_id": 587,
  "name": "Rifter", // Name might be part of the response depending on helper
  "build_price": 350000.75, // Calculated build price
  "materials": [
    { "type_id": 34, "name": "Tritanium", "quantity": 10000, "price_per_unit": 5.50, "total_price": 55000.00 },
    { "type_id": 35, "name": "Pyerite", "quantity": 5000, "price_per_unit": 10.20, "total_price": 51000.00 }
    // ... other materials
  ],
  "source_date": "2023-10-27T00:00:00.000Z" // The date used for fetching material prices
}

// If the item does not have a blueprint or materials/prices are not found,
// the helper might return null, 0, or an object indicating this.
// For example, if no blueprint:
// null
// Or if blueprint exists but no material prices:
// { "type_id": 587, "name": "Rifter", "build_price": 0, "materials": [], "source_date": "..." }
```
**Note:** The exact structure of the successful response depends on the implementation of the `getPriceFromBlueprint` helper function. The example above is a conceptual representation. If the `typeId` is not a valid number, or if an internal error occurs, an H3 error will be thrown.

## `GET /api/prices/type_id/{id}`

**Description:** Retrieves price data for a specific item type ID across all regions. It can filter prices by a number of past days or by a specific date (Unix timestamp). If both `days` and `date` are provided, `date` takes precedence. If no date filter is provided, it defaults to the last 1 day.

**Parameters:**
*   **Path Parameters:**
    *   `{id}`: (Required) The type ID of the item.
*   **Query Parameters:**
    *   `days`: (Optional) Integer, the number of past days to fetch prices for (e.g., 1, 7, 30). Defaults to 1 if `date` is not provided.
    *   `date`: (Optional) Integer, a Unix timestamp (in seconds). If provided, fetches prices on or after this specific date. The date is capped at "2003-10-01" if an earlier date is given.
*   **Body Parameters:** None

**Example Request (Conceptual):**
```typescript
// const typeId = 34; // Tritanium

// Get Tritanium prices for the last 1 day (default) across all regions
// const pricesLastDay = await $fetch(`/api/prices/type_id/${typeId}`);

// Get Tritanium prices for the last 7 days across all regions
// const pricesLast7Days = await $fetch(`/api/prices/type_id/${typeId}?days=7`);

// Get Tritanium prices on and after a specific Unix timestamp across all regions
// const pricesFromDate = await $fetch(`/api/prices/type_id/${typeId}?date=1672531200`);
```

**Example Response (Conceptual - Array of `IPrice` objects):**
```json
[
  {
    "type_id": 34,
    "region_id": 10000002, // The Forge
    "date": "2023-10-27T00:00:00.000Z",
    "average": 5.50,
    "highest": 5.80,
    "lowest": 5.20,
    "order_count": 150000,
    "volume": 1000000000
  },
  {
    "type_id": 34,
    "region_id": 10000043, // Domain
    "date": "2023-10-27T00:00:00.000Z",
    "average": 5.55,
    "highest": 5.90,
    "lowest": 5.25,
    "order_count": 100000,
    "volume": 700000000
  }
  // ... other price records for the specified type_id and date/days across different regions
]
// If no prices are found for the given criteria, an empty array [] is returned.
// If typeId is invalid or not found, it might also return an empty array.
```
