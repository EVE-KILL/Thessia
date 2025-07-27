# Search API

## `GET /api/search/{searchTerm}`

**Description:** Performs a search across multiple entity types (items, alliances, corporations, factions, systems, regions, characters) using Meilisearch. It first attempts an exact match (term enclosed in quotes). If no results are found, it falls back to a fuzzy search. Results are grouped by entity type, and the overall hits are sorted by entity type based on the number of results per type (ascending).

**Parameters:**
*   **Path Parameters:**
    *   `{searchTerm}`: (Required) The term to search for. Should be URL-encoded if it contains special characters.
*   **Query Parameters:**
    *   `lang`: (Optional) String, the language code for the search (e.g., "en", "de", "fr"). Defaults to "en". This affects how Meilisearch handles localized fields.
*   **Body Parameters:** None

**Example Request (Conceptual):**
```typescript
// Search for "Rifter"
// const searchTerm = "Rifter";
// const searchResults = await $fetch(`/api/search/${encodeURIComponent(searchTerm)}`);

// Search for "Caldari State" in German
// const searchTermDe = "Caldari State";
// const searchResultsDe = await $fetch(`/api/search/${encodeURIComponent(searchTermDe)}?lang=de`);
```

**Example Response (Conceptual - Structure from Meilisearch, augmented):**
```json
{
  "hits": [
    // Example: Character result (assuming characters had fewest results for this term)
    {
      "id": 90000001, // originalId is replaced by id if present
      "type": "character",
      "name": "Rifter Pilot Alpha",
      // ... other character fields from Meilisearch index
    },
    // Example: Item result
    {
      "id": 587,
      "type": "item",
      "name": { "en": "Rifter", "de": "Rifter", /* ... */ },
      // ... other item fields
    }
    // ... other hits, sorted by entity type count (ascending), then by Meilisearch relevance within type
  ],
  "query": "\"Rifter\"", // The query sent to Meilisearch (could be fuzzy if exact match failed)
  "processingTimeMs": 15,
  "limit": 20, // Default Meilisearch limit
  "offset": 0,
  "estimatedTotalHits": 5, // Example
  "facetDistribution": null, // Or actual facet data if configured
  "entityCounts": { // Counts of results per entity type
    "items": 3,
    "alliances": 0,
    "corporations": 0,
    "factions": 0,
    "systems": 0,
    "regions": 0,
    "characters": 2
  },
  "entityOrder": [ // Entity types with results, sorted by count (ascending)
    "characters",
    "items"
  ],
  "isExactMatch": true // True if the initial exact search yielded results, false if it fell back to fuzzy
}
```

**Example Response (Conceptual - Error):**
```json
// If searchTerm is missing
// Status: 400
{
  "statusCode": 400,
  "statusMessage": "Search term is required"
}

// If Meilisearch encounters an error, the Meilisearch helper might throw,
// leading to a 500 error from this endpoint.
```

**Notes:**
*   The `id` in the hits is replaced by `originalId` if `originalId` exists in the Meilisearch hit. This is to handle cases where the Meilisearch document ID might be different from the actual entity ID (e.g., for translations).
*   The `hits` array is re-sorted: first by entity type (based on which type has fewer results, ascending), and then by Meilisearch's internal relevance ranking within each type.
*   The response includes `entityCounts` (number of hits per type) and `entityOrder` (the order of types in the `hits` array).
*   `isExactMatch` flag indicates if the results came from the initial exact quoted search or the fallback fuzzy search.
