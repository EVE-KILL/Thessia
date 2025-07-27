import type { Collection } from "mongoose";
import { LRUCache } from "lru-cache";

/**
 * Cache for MongoDB indexes to avoid repeated queries
 * Uses LRU cache with automatic TTL management
 */
const indexCache = new LRUCache<
    string,
    Array<{ key: Record<string, number>; name: string }>
>({
    max: 50, // Maximum number of collections to cache
    ttl: 1000 * 60 * 5, // 5 minutes TTL
    allowStale: true,
});

/**
 * Get available indexes from MongoDB collection
 */
async function getAvailableIndexes(
    collection: any,
    collectionName: string
): Promise<Array<{ key: Record<string, number>; name: string }>> {
    // Check LRU cache first
    const cached = indexCache.get(collectionName);
    if (cached) {
        return cached;
    }

    try {
        const indexes = await collection.getIndexes({ full: true });
        const indexArray = Object.values(indexes).map((index: any) => ({
            key: index.key,
            name: index.name,
        }));

        // Cache the result in LRU cache
        indexCache.set(collectionName, indexArray);

        return indexArray;
    } catch (error) {
        // Return empty array and let MongoDB choose its own indexes
        const emptyResult: Array<{
            key: Record<string, number>;
            name: string;
        }> = [];

        // Cache the empty result to avoid repeated failures
        indexCache.set(collectionName, emptyResult);

        return emptyResult;
    }
}

/**
 * Extract filter fields from MongoDB query to analyze index requirements
 * Enhanced to handle $or queries and extract individual branches
 */
function extractFilterFields(filter: any): {
    fields: string[];
    isOrQuery: boolean;
    orBranches: string[][];
} {
    const fields: string[] = [];
    let isOrQuery = false;
    let orBranches: string[][] = [];

    function traverse(obj: any, parentKey?: string) {
        for (const [key, value] of Object.entries(obj)) {
            if (key === "$or" && Array.isArray(value)) {
                isOrQuery = true;

                // Extract fields from each $or branch
                for (const orCondition of value) {
                    const branchFields: string[] = [];
                    traverse(orCondition, key);

                    // Collect fields from this branch
                    for (const [branchKey, branchValue] of Object.entries(
                        orCondition
                    )) {
                        if (
                            typeof branchValue === "object" &&
                            branchValue !== null
                        ) {
                            branchFields.push(branchKey);
                        } else {
                            branchFields.push(branchKey);
                        }
                    }

                    if (branchFields.length > 0) {
                        orBranches.push(branchFields);
                    }
                }

                // Mark complex $or if multiple conditions
                if (value.length > 1) {
                    fields.push("$or_complex");
                }
            } else if (typeof value === "object" && value !== null) {
                // Handle nested conditions
                if (Array.isArray(value)) {
                    // Array conditions like $in, $nin
                    fields.push(key);
                } else {
                    // Nested object conditions
                    const hasOperators = Object.keys(value).some((k) =>
                        k.startsWith("$")
                    );
                    if (hasOperators) {
                        fields.push(key);
                        traverse(value, key);
                    } else {
                        fields.push(key);
                        traverse(value, key);
                    }
                }
            } else {
                fields.push(key);
            }
        }
    }

    traverse(filter);

    return {
        fields: [...new Set(fields)], // Remove duplicates
        isOrQuery,
        orBranches,
    };
}

/**
 * Calculate score for an index based on filter fields and sort options
 * Higher score = better index for the query
 * Enhanced with stricter scoring for complex queries and $or optimization
 */
function calculateIndexScore(
    index: { key: Record<string, number>; name: string },
    filterFields: string[],
    sortField?: string,
    isOrQuery: boolean = false,
    orBranches: string[][] = []
): number {
    // Skip the _id_ index
    if (!index.key || index.name === "_id_") {
        return -1000; // Ensure this never gets selected
    }

    const indexFields = Object.keys(index.key);
    let score = 0;

    // Special handling for $or queries with combined indexes
    if (isOrQuery && orBranches.length > 0) {
        // Check if this is a combined attacker/victim index
        const isCombinedIndex =
            index.name?.includes("attacker_victim") ||
            (indexFields.includes("attackers.character_id") &&
                indexFields.includes("victim.character_id")) ||
            (indexFields.includes("attackers.corporation_id") &&
                indexFields.includes("victim.corporation_id")) ||
            (indexFields.includes("attackers.alliance_id") &&
                indexFields.includes("victim.alliance_id"));

        if (isCombinedIndex) {
            // For $or queries, combined indexes are often less efficient than separate indexes
            // This is because MongoDB can't efficiently use compound indexes for $or conditions
            // where each branch only uses one field from the compound index

            // Check if this is a simple $or with just two branches (attacker vs victim pattern)
            const isSimpleAttackerVictimOr =
                orBranches.length === 2 &&
                orBranches.some((branch) =>
                    branch.some((field) => field.includes("attackers."))
                ) &&
                orBranches.some((branch) =>
                    branch.some((field) => field.includes("victim."))
                );

            if (isSimpleAttackerVictimOr) {
                // For simple attacker vs victim $or queries, compound indexes are less efficient
                // Penalize heavily as MongoDB will likely scan many documents
                score -= 75;
            } else {
                // Check if all OR branches can be satisfied by this combined index
                let branchesSupported = 0;
                for (const branch of orBranches) {
                    const branchSupported = branch.every((field) =>
                        indexFields.includes(field)
                    );
                    if (branchSupported) {
                        branchesSupported++;
                    }
                }

                // If this combined index supports all OR branches, give moderate bonus
                if (branchesSupported === orBranches.length) {
                    score += 30; // Reduced bonus due to $or inefficiency with compound indexes
                }
            }
        }
    }

    // Check if this index can support our filter fields
    let canUseIndex = true;
    let matchedFilterFields = 0;
    let exactFieldMatch = true;

    // For compound indexes, be much more strict about field matching
    for (const filterField of filterFields) {
        const indexPosition = indexFields.indexOf(filterField);
        if (indexPosition >= 0) {
            // Higher score for fields that appear earlier in the compound index
            score += (indexFields.length - indexPosition) * 10;
            matchedFilterFields++;
        } else {
            exactFieldMatch = false;
            // For compound indexes, missing fields are heavily penalized
            if (indexFields.length > 1) {
                score -= 20; // Heavy penalty for missing fields in compound index
            }
        }
    }

    // If compound index has fields not in our query, penalize heavily
    const extraFields = indexFields.length - matchedFilterFields;
    if (extraFields > 0 && indexFields.length > 1) {
        // For each extra field in compound index, apply significant penalty
        score -= extraFields * 15;

        // If more than half the index fields are unused, this is likely a bad choice
        if (extraFields > matchedFilterFields) {
            score -= 50;
        }
    }

    // Special handling for $or queries - they benefit most from simple single-field indexes
    if (isOrQuery && orBranches.length > 0) {
        // For $or queries, simple single-field indexes are most efficient
        if (indexFields.length === 1) {
            // Check if this single-field index matches any of the $or branches
            const indexField = indexFields[0];
            if (indexField) {
                const matchesOrBranch = orBranches.some((branch) =>
                    branch.includes(indexField)
                );

                if (matchesOrBranch) {
                    score += 50; // Big bonus for simple indexes that match $or branches
                }
            }
        } else {
            // Compound indexes are less efficient for $or queries
            score -= 20;
        }
    }

    // Special handling for complex $or queries
    if (filterFields.includes("$or_complex")) {
        // For complex $or queries, heavily favor simple indexes or our combined indexes
        if (
            indexFields.length > 2 &&
            !index.name?.includes("attacker_victim")
        ) {
            score -= 100; // Make compound indexes very unattractive (except combined ones)
        }

        // If this is a sort-only query due to complex $or, prefer sort index
        if (
            sortField &&
            indexFields.length === 1 &&
            indexFields[0] === sortField
        ) {
            score += 50; // Heavily favor simple sort index for complex $or
        }
    }

    // For perfect field matches on simple indexes, give bonus
    if (
        exactFieldMatch &&
        indexFields.length === filterFields.length &&
        indexFields.length <= 2
    ) {
        score += 20;
    }

    // If no filter fields match at all, this index is useless
    if (matchedFilterFields === 0) {
        return -1000;
    }

    // Bonus points for having kill_time as the last field (common pattern)
    if (indexFields[indexFields.length - 1] === "kill_time") {
        score += 5;
    }

    // Bonus for having the sort field in the index
    if (sortField && indexFields.includes(sortField)) {
        score += 8;
    }

    return score;
}

/**
 * Suggest optimal indexes that don't exist yet for a given query
 * Returns suggested index structures that would improve query performance
 */
export function suggestOptimalIndexes(
    filter: any,
    sortOptions?: Record<string, any>,
    availableIndexes: Array<{ key: Record<string, number>; name: string }> = []
): Array<{
    index: Record<string, number>;
    reason: string;
    score: number;
    indexName?: string;
}> {
    const suggestions: Array<{
        index: Record<string, number>;
        reason: string;
        score: number;
        indexName?: string;
    }> = [];

    // Extract filter analysis
    const filterAnalysis = extractFilterFields(filter);
    const { fields: filterFields, isOrQuery, orBranches } = filterAnalysis;

    // Get primary sort field
    let primarySortField: string | undefined;
    if (sortOptions && Object.keys(sortOptions).length > 0) {
        primarySortField = Object.keys(sortOptions)[0];
    }

    // Remove special markers from filter fields for index creation
    const cleanFilterFields = filterFields.filter(
        (field) => !field.startsWith("$")
    );

    // Check if we already have good indexes for these fields
    const existingIndexNames = new Set(
        availableIndexes.map((idx) => Object.keys(idx.key).sort().join("_"))
    );

    // Suggestion 1: Simple single-field indexes for each filter field
    for (const field of cleanFilterFields) {
        const singleFieldIndex = { [field]: 1 };
        const indexName = field.replace(/\./g, "_");

        if (!existingIndexNames.has(field)) {
            suggestions.push({
                index: singleFieldIndex,
                reason: `Single-field index for frequent filtering on ${field}`,
                score: 30,
                indexName: `${indexName}_1`,
            });
        }
    }

    // Suggestion 2: Compound index with filter fields + sort field
    if (primarySortField && cleanFilterFields.length > 0) {
        const compoundFields: Record<string, number> = {};

        // Add filter fields first (equality fields should come first in compound indexes)
        for (const field of cleanFilterFields) {
            compoundFields[field] = 1;
        }

        // Add sort field last
        if (!compoundFields[primarySortField]) {
            compoundFields[primarySortField] = sortOptions![primarySortField];
        }

        const compoundIndexName = Object.keys(compoundFields)
            .map((f) => f.replace(/\./g, "_"))
            .join("_");

        if (
            !existingIndexNames.has(
                Object.keys(compoundFields).sort().join("_")
            )
        ) {
            suggestions.push({
                index: compoundFields,
                reason: `Compound index supporting both filtering (${cleanFilterFields.join(
                    ", "
                )}) and sorting (${primarySortField})`,
                score: 60,
                indexName: compoundIndexName,
            });
        }
    }

    // Suggestion 3: Specialized $or query indexes
    if (isOrQuery && orBranches.length > 0) {
        // Check if this looks like an attacker/victim pattern
        const hasAttackerVictimPattern = orBranches.some(
            (branch) =>
                branch.some((field) => field.includes("attackers.")) &&
                orBranches.some((otherBranch) =>
                    otherBranch.some((field) => field.includes("victim."))
                )
        );

        if (hasAttackerVictimPattern) {
            // Extract entity types from the $or branches
            const entityTypes = new Set<string>();
            for (const branch of orBranches) {
                for (const field of branch) {
                    if (field.includes("character_id"))
                        entityTypes.add("character_id");
                    if (field.includes("corporation_id"))
                        entityTypes.add("corporation_id");
                    if (field.includes("alliance_id"))
                        entityTypes.add("alliance_id");
                }
            }

            // For simple attacker/victim $or queries, suggest separate simple indexes instead of combined
            // This is more efficient for MongoDB's $or query execution
            for (const entityType of entityTypes) {
                // Suggest separate simple attacker index (no kill_time for better $or performance)
                const attackerIndex: Record<string, number> = {
                    [`attackers.${entityType}`]: 1,
                };

                suggestions.push({
                    index: attackerIndex,
                    reason: `Simple attacker ${entityType} index optimized for $or queries (single-field indexes are most efficient for $or)`,
                    score: 80,
                    indexName: `attackers_${entityType.replace(".", "_")}_1`,
                });

                // Suggest separate simple victim index (no kill_time for better $or performance)
                const victimIndex: Record<string, number> = {
                    [`victim.${entityType}`]: 1,
                };

                suggestions.push({
                    index: victimIndex,
                    reason: `Simple victim ${entityType} index optimized for $or queries (single-field indexes are most efficient for $or)`,
                    score: 80,
                    indexName: `victim_${entityType.replace(".", "_")}_1`,
                });

                // Also suggest compound versions with kill_time but with lower score
                if (primarySortField) {
                    const attackerCompoundIndex: Record<string, number> = {
                        [`attackers.${entityType}`]: 1,
                        [primarySortField]: sortOptions![primarySortField],
                    };

                    suggestions.push({
                        index: attackerCompoundIndex,
                        reason: `Attacker ${entityType} + sort compound index (less efficient than simple index for $or, but supports sorting)`,
                        score: 60,
                        indexName: `attackers_${entityType.replace(
                            ".",
                            "_"
                        )}_${primarySortField.replace(".", "_")}`,
                    });

                    const victimCompoundIndex: Record<string, number> = {
                        [`victim.${entityType}`]: 1,
                        [primarySortField]: sortOptions![primarySortField],
                    };

                    suggestions.push({
                        index: victimCompoundIndex,
                        reason: `Victim ${entityType} + sort compound index (less efficient than simple index for $or, but supports sorting)`,
                        score: 60,
                        indexName: `victim_${entityType.replace(
                            ".",
                            "_"
                        )}_${primarySortField.replace(".", "_")}`,
                    });
                }
            }

            // Also suggest combined indexes but with lower score
            for (const entityType of entityTypes) {
                const combinedIndex: Record<string, number> = {
                    [`attackers.${entityType}`]: 1,
                    [`victim.${entityType}`]: 1,
                };

                if (primarySortField) {
                    combinedIndex[primarySortField] =
                        sortOptions![primarySortField];
                }

                const indexName = `attacker_victim_${entityType.replace(
                    ".",
                    "_"
                )}${
                    primarySortField
                        ? "_" + primarySortField.replace(".", "_")
                        : ""
                }`;

                suggestions.push({
                    index: combinedIndex,
                    reason: `Combined attacker/victim index for ${entityType} (Note: separate indexes usually perform better for $or queries)`,
                    score: 40,
                    indexName,
                });
            }
        } else {
            // General $or optimization - suggest indexes for each branch
            for (let i = 0; i < orBranches.length; i++) {
                const branch = orBranches[i];
                if (branch && branch.length > 0) {
                    const branchIndex: Record<string, number> = {};

                    for (const field of branch) {
                        branchIndex[field] = 1;
                    }

                    if (primarySortField && !branchIndex[primarySortField]) {
                        branchIndex[primarySortField] =
                            sortOptions![primarySortField];
                    }

                    const branchIndexName = Object.keys(branchIndex)
                        .map((f) => f.replace(/\./g, "_"))
                        .join("_");

                    suggestions.push({
                        index: branchIndex,
                        reason: `Index for $or branch ${
                            i + 1
                        }: optimizes ${branch.join(", ")}`,
                        score: 50,
                        indexName: branchIndexName,
                    });
                }
            }
        }
    }

    // Suggestion 4: Sort-only index if no good compound options exist
    if (primarySortField && cleanFilterFields.length === 0) {
        const sortIndex = {
            [primarySortField]: sortOptions![primarySortField],
        };
        const sortIndexName = primarySortField.replace(/\./g, "_") + "_sort";

        if (!existingIndexNames.has(primarySortField)) {
            suggestions.push({
                index: sortIndex,
                reason: `Sort-only index for ${primarySortField} ordering`,
                score: 25,
                indexName: sortIndexName,
            });
        }
    }

    // Sort suggestions by score (highest first) and remove duplicates
    const uniqueSuggestions = suggestions.filter(
        (suggestion, index, self) =>
            index ===
            self.findIndex(
                (s) =>
                    JSON.stringify(s.index) === JSON.stringify(suggestion.index)
            )
    );

    return uniqueSuggestions.sort((a, b) => b.score - a.score);
}

/**
 * Determines the best index to use for a query based on filter and sort
 * Uses advanced scoring algorithm to find optimal compound indexes
 * Optionally returns suggestions for missing indexes that would improve performance
 */
export async function determineOptimalIndexHint(
    collection: any,
    collectionName: string,
    filter: any,
    sortOptions?: Record<string, any>,
    debugPrefix: string = "[Index Optimizer]",
    fallbackIndex?: Record<string, number>,
    returnSuggestions: boolean = false
): Promise<
    | Record<string, number>
    | undefined
    | {
          hint?: Record<string, number>;
          suggestions?: Array<{
              index: Record<string, number>;
              reason: string;
              score: number;
              indexName?: string;
          }>;
      }
> {
    try {
        const availableIndexes = await getAvailableIndexes(
            collection,
            collectionName
        );

        // Extract the primary sort field if provided
        let primarySortField: string | undefined;
        if (sortOptions && Object.keys(sortOptions).length > 0) {
            primarySortField = Object.keys(sortOptions)[0];
        }

        // Get filter fields to check for optimal compound indexes
        const filterAnalysis = extractFilterFields(filter);
        const { fields: filterFields, isOrQuery, orBranches } = filterAnalysis;

        // Score all available indexes using the improved algorithm
        let bestIndex = null;
        let bestScore = 0;

        for (const index of availableIndexes) {
            const score = calculateIndexScore(
                index,
                filterFields,
                primarySortField,
                isOrQuery,
                orBranches
            );

            if (score > bestScore) {
                bestScore = score;
                bestIndex = index;
            }
        }

        // Generate suggestions for missing indexes if no good index found
        if (bestScore < 50) {
            // Suggest when existing indexes are poor
            const suggestions = suggestOptimalIndexes(
                filter,
                sortOptions,
                availableIndexes
            );

            if (suggestions.length > 0) {
                console.log(
                    `${debugPrefix} Query could benefit from better indexes:`
                );
                console.log(`${debugPrefix} Collection: ${collectionName}`);
                console.log(`${debugPrefix} Current best score: ${bestScore}`);
                console.log(
                    `${debugPrefix} Filter:`,
                    JSON.stringify(filter, null, 2)
                );
                if (sortOptions) {
                    console.log(
                        `${debugPrefix} Sort:`,
                        JSON.stringify(sortOptions, null, 2)
                    );
                }
                console.log(`${debugPrefix} Suggested indexes:`);

                suggestions.slice(0, 3).forEach((suggestion, i) => {
                    // Show top 3 suggestions
                    console.log(
                        `${debugPrefix}   ${i + 1}. ${
                            suggestion.reason
                        } (Score: ${suggestion.score})`
                    );
                    console.log(
                        `${debugPrefix}      Index: ${JSON.stringify(
                            suggestion.index
                        )}`
                    );
                    if (suggestion.indexName) {
                        console.log(
                            `${debugPrefix}      Name: ${suggestion.indexName}`
                        );
                    }
                });
            }
        }

        if (returnSuggestions) {
            const suggestions = suggestOptimalIndexes(
                filter,
                sortOptions,
                availableIndexes
            );
            return {
                hint: bestIndex && bestScore > 0 ? bestIndex.key : undefined,
                suggestions,
            };
        }

        if (bestIndex && bestScore > 0) {
            return bestIndex.key;
        } else {
            // Intelligent fallback based on query type
            if (filterFields.includes("$or_complex")) {
                // For complex $or queries, prefer simple sort index
                return sortOptions ? sortOptions : { kill_time: -1 };
            }

            // Use provided fallback or intelligent default
            if (fallbackIndex) {
                return fallbackIndex;
            } else {
                // Default to kill_time index for time-series data
                return { kill_time: -1 };
            }
        }
    } catch (error) {
        // Use provided fallback or let MongoDB choose
        if (fallbackIndex) {
            return fallbackIndex;
        }
        return undefined;
    }
}

/**
 * Check if a filter contains any kill_time constraints
 */
export function hasKillTimeFilter(filter: any): boolean {
    if (!filter || typeof filter !== "object") {
        return false;
    }

    // Direct kill_time filter
    if (filter.kill_time) {
        return true;
    }

    // Check $and conditions
    if (filter.$and && Array.isArray(filter.$and)) {
        return filter.$and.some((condition: any) =>
            hasKillTimeFilter(condition)
        );
    }

    // Check $or conditions
    if (filter.$or && Array.isArray(filter.$or)) {
        return filter.$or.some((condition: any) =>
            hasKillTimeFilter(condition)
        );
    }

    return false;
}

/**
 * Determines the best index to use for an aggregation pipeline
 * Focuses on the $match stage for index optimization
 */
export async function determineOptimalAggregationHint(
    collection: any,
    collectionName: string,
    pipeline: any[],
    debugPrefix: string = "[Aggregation Optimizer]",
    fallbackIndex?: Record<string, number>
): Promise<Record<string, number> | undefined> {
    try {
        // Find the first $match stage in the pipeline
        const matchStage = pipeline.find((stage) => stage.$match);
        if (!matchStage) {
            // No $match stage, use fallback or default
            return fallbackIndex || { _id: 1 };
        }

        // Use the existing optimizer on the $match filter
        const result = (await determineOptimalIndexHint(
            collection,
            collectionName,
            matchStage.$match,
            undefined, // No sort for aggregation
            debugPrefix,
            fallbackIndex,
            false // Don't return suggestions for aggregation
        )) as Record<string, number> | undefined;

        return result;
    } catch (error) {
        // Use provided fallback or let MongoDB choose
        if (fallbackIndex) {
            return fallbackIndex;
        }
        return undefined;
    }
}

/**
 * Adds a default kill_time filter to limit results to last 30 days if no time constraint exists
 */
export function addDefaultTimeFilter(filter: any): any {
    if (hasKillTimeFilter(filter)) {
        return filter; // Already has time constraint, don't modify
    }

    // Calculate 30 days ago
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    // If filter is empty, just add kill_time constraint
    if (!filter || Object.keys(filter).length === 0) {
        return { kill_time: { $gte: thirtyDaysAgo } };
    }

    // If filter exists but no time constraint, add it
    return {
        kill_time: { $gte: thirtyDaysAgo },
        ...filter,
    };
}
