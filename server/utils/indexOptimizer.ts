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
 * Extract potential index fields from a filter expression
 */
function extractFilterFields(filter: any): string[] {
    const fields: string[] = [];

    // Handle $and and $or operators
    if (filter.$and && Array.isArray(filter.$and)) {
        // For AND, any field could be a good candidate for an index
        filter.$and.forEach((condition: any) => {
            fields.push(...extractFilterFields(condition));
        });
    } else if (filter.$or && Array.isArray(filter.$or)) {
        // For OR, we ideally need indexes on all branches, but take the first one for now
        if (filter.$or.length > 0) {
            fields.push(...extractFilterFields(filter.$or[0]));
        }
    } else {
        // For regular filters, add any non-operator keys
        Object.keys(filter).forEach((key) => {
            if (!key.startsWith("$")) {
                fields.push(key);
            }
        });
    }

    return fields;
}

/**
 * Calculate score for an index based on filter fields and sort options
 * Higher score = better index for the query
 * This uses the proven algorithm from killmails.get.ts
 */
function calculateIndexScore(
    index: { key: Record<string, number>; name: string },
    filterFields: string[],
    sortField?: string
): number {
    // Skip the _id_ index
    if (!index.key || index.name === "_id_") {
        return -1000; // Ensure this never gets selected
    }

    const indexFields = Object.keys(index.key);
    let score = 0;

    // Check if this index can support our filter fields
    let canUseIndex = true;
    let matchedFilterFields = 0;

    for (const filterField of filterFields) {
        const indexPosition = indexFields.indexOf(filterField);
        if (indexPosition >= 0) {
            // Higher score for fields that appear earlier in the compound index
            // This is crucial for MongoDB compound index performance
            score += (indexFields.length - indexPosition) * 10;
            matchedFilterFields++;
        } else {
            // If a filter field is not in the index, we can still use it but with lower score
            // unless it's a compound index where order matters
            if (indexFields.length > 1 && matchedFilterFields === 0) {
                canUseIndex = false;
                break;
            }
        }
    }

    if (!canUseIndex) {
        return -1000; // This index cannot be effectively used
    }

    // Bonus points for having kill_time as the last field (common pattern)
    if (indexFields[indexFields.length - 1] === "kill_time") {
        score += 5;
    }

    // Bonus for having the sort field in the index
    if (sortField && indexFields.includes(sortField)) {
        score += 8;
    }

    // Penalty for unused index fields (less selective)
    const unusedFields = indexFields.length - matchedFilterFields;
    score -= unusedFields * 2;

    return score;
}

/**
 * Determines the best index to use for a query based on filter and sort
 * Uses advanced scoring algorithm to find optimal compound indexes
 */
export async function determineOptimalIndexHint(
    collection: any,
    collectionName: string,
    filter: any,
    sortOptions?: Record<string, any>,
    debugPrefix: string = "[Index Optimizer]",
    fallbackIndex?: Record<string, number>
): Promise<Record<string, number> | undefined> {
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
        const filterFields = extractFilterFields(filter);

        // Score all available indexes using the improved algorithm
        let bestIndex = null;
        let bestScore = 0;

        for (const index of availableIndexes) {
            const score = calculateIndexScore(
                index,
                filterFields,
                primarySortField
            );

            if (score > bestScore) {
                bestScore = score;
                bestIndex = index;
            }
        }

        if (bestIndex && bestScore > 0) {
            return bestIndex.key;
        } else {
            // Use provided fallback or let MongoDB choose
            if (fallbackIndex) {
                return fallbackIndex;
            } else {
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
