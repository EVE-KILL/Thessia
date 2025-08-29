interface SearchHit {
    id: any;
    originalId?: any;
    type: string;
    deleted?: boolean;
    last_active?: string;
    updatedAt?: string;
    [key: string]: any; // Allow other properties
}

/**
 * Sort search results within each entity type to prioritize recently active entities
 * For characters: prioritize non-deleted, then by last_active
 * For corporations/alliances: prioritize by updatedAt (recent activity indicates current entity)
 * @param results - Array of search hits to sort
 * @returns Sorted array with recently active entities first
 */
function sortByActivityStatus(results: SearchHit[]): SearchHit[] {
    return results.sort((a, b) => {
        // For characters, prioritize non-deleted first
        if (a.type === "character" || b.type === "character") {
            const aDeleted = a.deleted === true;
            const bDeleted = b.deleted === true;

            if (!aDeleted && bDeleted) return -1;
            if (aDeleted && !bDeleted) return 1;

            // If both have same deleted status, sort by last_active or updatedAt
            const aActivity = new Date(
                a.last_active || a.updatedAt || 0
            ).getTime();
            const bActivity = new Date(
                b.last_active || b.updatedAt || 0
            ).getTime();
            return bActivity - aActivity; // More recent first
        }

        // For corporations/alliances, sort by updatedAt (more recent = current entity with that name)
        const aUpdated = new Date(a.updatedAt || 0).getTime();
        const bUpdated = new Date(b.updatedAt || 0).getTime();
        return bUpdated - aUpdated; // More recent first
    });
}

/**
 * Search endpoint that first tries exact matching with quotes, then falls back to fuzzy search if no results.
 * Also handles translation IDs properly for multilingual search.
 */
export default defineCachedEventHandler(
    async (event) => {
        const searchTerm = decodeURIComponent(
            event.context.params?.searchTerm || ""
        );

        if (!searchTerm) {
            throw createError({
                statusCode: 400,
                statusMessage: "Search term is required",
            });
        }

        // Get query parameters
        const query = getQuery(event as any);
        const lang = (query.lang as string) || "en"; // Default to English if no language specified

        const meilisearch = new Meilisearch();
        let results = null;

        // STEP 1: Try exact match search first (with quotes)
        const exactSearchTerm = `"${searchTerm}"`;
        const exactResults = await meilisearch.search(
            "nitro",
            exactSearchTerm,
            {
                lang,
            }
        );

        // STEP 2: If no results from exact search, try fuzzy search without quotes
        if (exactResults.hits.length === 0) {
            // No results found with exact search, try fuzzy search
            results = await meilisearch.search("nitro", searchTerm, {
                lang,
            });
        } else {
            // Use the exact search results
            results = exactResults;
        }

        // Process hits to replace id with originalId when it exists
        results.hits = results.hits.map((hit: SearchHit) => {
            if (hit.originalId !== undefined) {
                // Replace the ID with the original ID
                hit.id = hit.originalId;

                // Remove the originalId property since it's now redundant
                delete hit.originalId;
            }
            return hit;
        });

        // Classify items vs ships for proper type assignment
        const itemHits = results.hits.filter(
            (hit: SearchHit) => hit.type === "item"
        );
        if (itemHits.length > 0) {
            try {
                const typeIds = itemHits.map((hit: SearchHit) =>
                    Number(hit.id)
                );
                const classifications = await batchClassifyTypeIds(typeIds);

                // Update the type based on classification
                for (const hit of itemHits) {
                    const classification = classifications.get(Number(hit.id));
                    if (classification) {
                        hit.type = classification; // Either 'ship' or 'item'
                    }
                }
            } catch (error) {
                console.error(
                    "Error classifying items vs ships in search results:",
                    error
                );
                // If classification fails, leave as 'item' (original behavior)
            }
        }

        // Group results by type
        const groupedResults: Record<string, any[]> = {
            items: [],
            ships: [],
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
                    groupedResults.items!.push(hit);
                    break;
                case "ship":
                    groupedResults.ships!.push(hit);
                    break;
                case "alliance":
                    groupedResults.alliances!.push(hit);
                    break;
                case "corporation":
                    groupedResults.corporations!.push(hit);
                    break;
                case "faction":
                    groupedResults.factions!.push(hit);
                    break;
                case "system":
                    groupedResults.systems!.push(hit);
                    break;
                case "region":
                    groupedResults.regions!.push(hit);
                    break;
                case "character":
                    groupedResults.characters!.push(hit);
                    break;
            }
        }

        // Apply activity-based sorting to prioritize recent entities over older ones with same names
        groupedResults.alliances = sortByActivityStatus(
            groupedResults.alliances
        );
        groupedResults.corporations = sortByActivityStatus(
            groupedResults.corporations
        );
        groupedResults.characters = sortByActivityStatus(
            groupedResults.characters
        );

        // Calculate entity counts
        const entityCounts = {
            items: groupedResults.items!.length,
            ships: groupedResults.ships!.length,
            alliances: groupedResults.alliances!.length,
            corporations: groupedResults.corporations!.length,
            factions: groupedResults.factions!.length,
            systems: groupedResults.systems!.length,
            regions: groupedResults.regions!.length,
            characters: groupedResults.characters!.length,
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
            const entityArray = groupedResults[entityKey];
            if (entityArray) {
                sortedHits = [...sortedHits, ...entityArray];
            }
        }

        // Replace the hits with our reordered array
        results.hits = sortedHits;

        // Add the entity counts to the results object
        results.entityCounts = entityCounts;

        // Add the order of entity types for reference
        results.entityOrder = entityTypesWithResults;

        // Add a flag indicating whether the results came from exact matching
        results.isExactMatch = exactResults.hits.length > 0;

        return results;
    },
    {
        maxAge: 60,
        staleMaxAge: -1,
        swr: true,
        base: "redis",
        getKey: (event) => {
            const searchTerm = decodeURIComponent(
                event.context.params?.searchTerm || ""
            );
            const query = getQuery(event as any);
            const lang = (query.lang as string) || "en";
            return `search:${searchTerm}:${lang}`;
        },
    }
);
