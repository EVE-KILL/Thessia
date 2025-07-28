import { LRUCache } from "lru-cache";
import type { IndexDescription } from "mongodb";
import { cliLogger } from "~/server/helpers/Logger";

/**
 * Cache for MongoDB indexes to avoid repeated queries
 */
const indexCache = new LRUCache<string, IndexDescription[]>({
    max: 50,
    ttl: 5 * 60 * 1000, // 5 minutes TTL
    allowStale: true,
});

/**
 * Check if we're in development mode
 */
const isDev = process.env.NODE_ENV === "development";

/**
 * Development-only logging helper
 */
function devLog(prefix: string, message: string) {
    if (!isDev) return;
    cliLogger.info(`${prefix} ${message}`);
}
/**
 * Fetch available indexes from MongoDB collection
 */
async function fetchIndexes(
    collection: any,
    collectionName: string
): Promise<IndexDescription[]> {
    const cached = indexCache.get(collectionName);
    if (cached) {
        return cached;
    }

    try {
        const indexes = await collection.listIndexes().toArray();
        indexCache.set(collectionName, indexes);
        return indexes;
    } catch (error) {
        cliLogger.warn(
            `Failed to fetch indexes for ${collectionName}: ${error}`
        );
        const emptyResult: IndexDescription[] = [];
        indexCache.set(collectionName, emptyResult);
        return emptyResult;
    }
}

/**
 * Extract filter fields from MongoDB query
 */
function extractFilterFields(filter: Record<string, any>): {
    fields: string[];
    isOrQuery: boolean;
} {
    const fields = new Set<string>();
    let isOrQuery = false;

    function traverse(obj: any) {
        if (obj && typeof obj === "object") {
            // Check for $or queries
            if (Array.isArray(obj.$or)) {
                isOrQuery = true;
                obj.$or.forEach(traverse);
            }

            // Extract field names (skip operators)
            for (const [key, value] of Object.entries(obj)) {
                if (key.startsWith("$")) continue;
                fields.add(key);
                if (typeof value === "object" && value !== null) {
                    traverse(value);
                }
            }
        }
    }

    traverse(filter);

    return {
        fields: Array.from(fields),
        isOrQuery,
    };
}

/**
 * Score an index for a given query
 */
function scoreIndex(
    index: IndexDescription,
    filterFields: string[],
    sortField?: string,
    isOrQuery: boolean = false
): number {
    const indexKeys = Object.keys(index.key);

    // Skip the default _id index
    if (index.name === "_id_") return -Infinity;

    // For $or queries, let MongoDB handle optimization
    if (isOrQuery) return 0;

    // Count matching filter fields
    const matchingFields = filterFields.filter((field) =>
        indexKeys.includes(field)
    ).length;

    // Base score from matching fields
    let score = matchingFields * 10;

    // Bonus if index supports sort field
    if (sortField && indexKeys.includes(sortField)) {
        score += 5;
    }

    // Penalty for extra fields in compound indexes that we don't use
    const sortFieldInIndex = sortField && indexKeys.includes(sortField) ? 1 : 0;
    const unusedFields = Math.max(
        0,
        indexKeys.length - matchingFields - sortFieldInIndex
    );
    score -= unusedFields * 2;

    // Bonus for exact match (all our fields, no extra fields)
    // Don't double-count if sort field is also a filter field
    const sortFieldAlsoInFilter = sortField && filterFields.includes(sortField);
    const totalUsefulFields = sortFieldAlsoInFilter
        ? matchingFields // Don't add sortFieldInIndex if it's already counted in matchingFields
        : matchingFields + sortFieldInIndex;

    if (totalUsefulFields === indexKeys.length && matchingFields > 0) {
        score += 10;
    }

    return score;
}

/**
 * Determines the best index to use for a query based on filter and sort
 * Returns undefined for $or queries to let MongoDB handle optimization
 */
export async function determineOptimalIndexHint(
    collection: any,
    filter: Record<string, any> = {},
    sortOptions?: Record<string, number>,
    debugPrefix: string = "[Index Optimizer]"
): Promise<Record<string, number> | undefined> {
    try {
        // Get collection name from the collection object
        const collectionName =
            collection?.collectionName ||
            collection?.namespace?.collection ||
            collection?.name ||
            "unknown";

        const { fields: filterFields, isOrQuery } = extractFilterFields(filter);
        const sortField = sortOptions ? Object.keys(sortOptions)[0] : undefined;

        // For $or queries, let MongoDB handle optimization
        if (isOrQuery) {
            return undefined;
        }

        const indexes = await fetchIndexes(collection, collectionName);

        let bestIndex: IndexDescription | undefined;
        let bestScore = -Infinity;
        let bestMatches = 0;

        for (const index of indexes) {
            const score = scoreIndex(index, filterFields, sortField, isOrQuery);
            const matchingFields = filterFields.filter((field) =>
                Object.keys(index.key).includes(field)
            ).length;

            // First look at score, then at matchingFields in case of tie
            if (
                score > bestScore ||
                (score === bestScore && matchingFields > bestMatches)
            ) {
                bestScore = score;
                bestIndex = index;
                bestMatches = matchingFields;
            }
        }

        if (bestIndex && bestScore > 0) {
            devLog(
                debugPrefix,
                `✅ Selected index '${
                    bestIndex.name
                }' for ${collectionName} (score: ${bestScore}, matches: ${bestMatches}/${
                    filterFields.length
                }, fields: [${filterFields.join(", ")}], sort: ${
                    sortField || "none"
                })`
            );
            return bestIndex.key as Record<string, number>;
        } else {
            devLog(
                debugPrefix,
                `❌ No suitable index found for ${collectionName} (best score: ${bestScore}) - letting MongoDB choose`
            );
            return undefined;
        }
    } catch (error) {
        cliLogger.warn(
            `${debugPrefix} Failed to determine optimal index: ${error}`
        );
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
    pipeline: any[],
    debugPrefix: string = "[Aggregation Optimizer]"
): Promise<Record<string, number> | undefined> {
    try {
        // Get collection name from the collection object
        const collectionName =
            collection?.collectionName ||
            collection?.namespace?.collection ||
            collection?.name ||
            "unknown";

        // Find the first $match stage in the pipeline
        const matchStage = pipeline.find((stage) => stage.$match);
        if (!matchStage) {
            devLog(
                debugPrefix,
                `❌ No $match stage found for ${collectionName} aggregation - letting MongoDB handle optimization`
            );
            return undefined;
        }

        // Use the existing optimizer on the $match filter
        const result = await determineOptimalIndexHint(
            collection,
            matchStage.$match,
            undefined, // No sort for aggregation
            debugPrefix
        );

        return result;
    } catch (error) {
        const collectionName =
            collection?.collectionName ||
            collection?.namespace?.collection ||
            collection?.name ||
            "unknown";
        cliLogger.warn(
            `${debugPrefix} Failed to determine aggregation hint for ${collectionName}: ${error}`
        );
        return undefined;
    }
}

/**
 * Adds a default kill_time filter to limit results to last 30 days if no time constraint exists
 */
export function addDefaultTimeFilter(filter: any): any {
    const hasTimeFilter = hasKillTimeFilter(filter);

    if (hasTimeFilter) {
        return filter; // Already has time constraint, don't modify
    }

    // Calculate 30 days ago
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    // If filter is empty, just add kill_time constraint
    if (!filter || Object.keys(filter).length === 0) {
        const newFilter = { kill_time: { $gte: thirtyDaysAgo } };
        devLog(
            "[Time Filter]",
            `📅 Added default 30-day time filter to empty query`
        );
        return newFilter;
    }

    // If filter exists but no time constraint, add it
    const newFilter = {
        kill_time: { $gte: thirtyDaysAgo },
        ...filter,
    };

    devLog(
        "[Time Filter]",
        `📅 Added default 30-day time filter to existing query`
    );

    return newFilter;
}
