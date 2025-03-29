import { Meilisearch } from "~/server/helpers/Meilisearch";

export default defineEventHandler(async (event) => {
  const searchTerm = event.context.params?.searchTerm;

  if (!searchTerm) {
    throw createError({
      statusCode: 400,
      statusMessage: "Search term is required",
    });
  }

  // Get query parameters
  const query = getQuery(event);
  const lang = (query.lang as string) || "en"; // Default to English if no language specified

  // html decode the searchTerm
  const decodedSearchTerm = decodeURIComponent(searchTerm);
  const meilisearch = new Meilisearch();

  // Search with language filtering
  const results = await meilisearch.search("nitro", decodedSearchTerm, {
    lang,
  });

  // Group results by type
  const groupedResults: Record<string, any[]> = {
    items: [],
    alliances: [],
    corporations: [],
    factions: [],
    systems: [],
    regions: [],
    characters: [],
  };

  // Group hits by their entity type
  for (const hit of results.hits) {
    switch (hit.type) {
      case "item":
        groupedResults.items.push(hit);
        break;
      case "alliance":
        groupedResults.alliances.push(hit);
        break;
      case "corporation":
        groupedResults.corporations.push(hit);
        break;
      case "faction":
        groupedResults.factions.push(hit);
        break;
      case "system":
        groupedResults.systems.push(hit);
        break;
      case "region":
        groupedResults.regions.push(hit);
        break;
      case "character":
        groupedResults.characters.push(hit);
        break;
    }
  }

  // Calculate entity counts
  const entityCounts = {
    items: groupedResults.items.length,
    alliances: groupedResults.alliances.length,
    corporations: groupedResults.corporations.length,
    factions: groupedResults.factions.length,
    systems: groupedResults.systems.length,
    regions: groupedResults.regions.length,
    characters: groupedResults.characters.length,
  };

  // Get entity types with results, sorted by result count (ascending)
  const entityTypesWithResults = Object.entries(entityCounts)
    .filter(([_, count]) => count > 0)
    .sort((a, b) => a[1] - b[1])
    .map(([type]) => type);

  // Prepare a new sorted array of results based on the entity type order
  let sortedHits: any[] = [];
  for (const entityType of entityTypesWithResults) {
    const entityKey = entityType as keyof typeof groupedResults;
    sortedHits = [...sortedHits, ...groupedResults[entityKey]];
  }

  // Replace the hits with our reordered array
  results.hits = sortedHits;

  // Add the entity counts to the results object
  results.entityCounts = entityCounts;

  // Add the order of entity types for reference
  results.entityOrder = entityTypesWithResults;

  return results;
});
