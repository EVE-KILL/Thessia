/**
 * Comprehensive domain cache management utility
 *
 * This utility provides functions to clear all caches related to domain settings
 * and API responses. Use this when domain data changes and you need to ensure
 * fresh data is served.
 */

import { clearAllDomainCaches } from "../middleware/domainDetection";
import { invalidateDomainCache } from "./domainCacheManager";

/**
 * Clear all caches for a specific domain
 * This includes:
 * - Domain detection middleware cache
 * - Database timestamp cache
 * - Redis cached API responses (defineCachedEventHandler)
 *
 * @param domain The domain name to clear caches for
 */
export async function clearDomainCaches(domain: string): Promise<void> {
    console.log(
        `[Cache Utils] Starting comprehensive cache clear for domain: ${domain}`
    );

    try {
        // Clear using the database-driven cache manager (most comprehensive)
        await invalidateDomainCache(domain);
        console.log(
            `[Cache Utils] Database-driven cache clearing completed for ${domain}`
        );

        // Also clear middleware caches as backup
        await clearAllDomainCaches(domain);
        console.log(
            `[Cache Utils] Middleware cache clearing completed for ${domain}`
        );

        console.log(
            `[Cache Utils] All caches cleared successfully for domain: ${domain}`
        );
    } catch (error) {
        console.error(
            `[Cache Utils] Error clearing caches for domain ${domain}:`,
            error
        );
        throw error;
    }
}

/**
 * Clear specific cache types for debugging
 */
export async function clearSpecificDomainCache(
    domain: string,
    cacheType: "middleware" | "redis" | "timestamp" | "all"
): Promise<void> {
    console.log(
        `[Cache Utils] Clearing ${cacheType} cache for domain: ${domain}`
    );

    try {
        switch (cacheType) {
            case "middleware":
                await clearAllDomainCaches(domain);
                break;
            case "redis":
                // This will clear Redis caches but not middleware
                const storage = useStorage("redis");
                const patterns = [
                    `domain:entities:${domain}:v1`,
                    `domain:stats:*`,
                    `domain:campaigns:*`,
                    `domain:killmails:*`,
                ];

                for (const pattern of patterns) {
                    try {
                        if (pattern.includes("*")) {
                            // Handle wildcard patterns
                            const redisClient = (storage as any).driver?.base
                                ?.client;
                            if (redisClient?.keys) {
                                const keys = await redisClient.keys(pattern);
                                for (const key of keys) {
                                    await storage.removeItem(key);
                                }
                            }
                        } else {
                            // Handle specific keys
                            const exists = await storage.hasItem(pattern);
                            if (exists) {
                                await storage.removeItem(pattern);
                            }
                        }
                    } catch (error) {
                        console.warn(
                            `[Cache Utils] Failed to clear pattern ${pattern}:`,
                            error
                        );
                    }
                }
                break;
            case "timestamp":
                const { clearDomainTimestampCache } = await import(
                    "./domainCacheManager"
                );
                clearDomainTimestampCache(domain);
                break;
            case "all":
                await invalidateDomainCache(domain);
                break;
        }

        console.log(
            `[Cache Utils] ${cacheType} cache cleared for domain: ${domain}`
        );
    } catch (error) {
        console.error(
            `[Cache Utils] Error clearing ${cacheType} cache for domain ${domain}:`,
            error
        );
        throw error;
    }
}

/**
 * Verify cache clearing by checking if keys still exist
 */
export async function verifyCacheCleared(domain: string): Promise<{
    cleared: boolean;
    remaining_keys: string[];
    timestamp_cache: boolean;
}> {
    const result = {
        cleared: true,
        remaining_keys: [] as string[],
        timestamp_cache: false,
    };

    try {
        // Check Redis cache keys
        const storage = useStorage("redis");
        const redisClient = (storage as any).driver?.base?.client;

        if (redisClient?.keys) {
            const patterns = [
                `domain:entities:${domain}:v1`,
                `domain:stats:*`,
                `domain:campaigns:*`,
                `domain:killmails:*`,
                `*${domain}*`,
            ];

            for (const pattern of patterns) {
                const keys = await redisClient.keys(pattern);
                if (keys.length > 0) {
                    result.remaining_keys.push(...keys);
                    result.cleared = false;
                }
            }
        }

        // Check timestamp cache
        const { getDomainTimestampCache } = await import(
            "./domainCacheManager"
        );
        const timestampCache = getDomainTimestampCache();
        result.timestamp_cache = timestampCache.has(domain);
    } catch (error) {
        console.error(
            `[Cache Utils] Error verifying cache for domain ${domain}:`,
            error
        );
    }

    return result;
}
