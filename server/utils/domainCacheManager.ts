/**
 * Database-driven cache manager for domain configurations
 * Automatically invalidates caches when database changes are detected
 */

import type { ICustomDomainDocument } from "../models/CustomDomains";
import { CustomDomains } from "../models/CustomDomains";

// In-memory cache for domain timestamps to detect changes
const domainTimestampCache = new Map<string, Date>();

/**
 * Get domain configuration with automatic cache invalidation
 * Checks database timestamp and clears caches if data has changed
 */
export async function getDomainWithCacheCheck(
    domain: string
): Promise<ICustomDomainDocument | null> {
    try {
        // First, get the current updated_at timestamp from database
        const timestampCheck = await CustomDomains.findOne(
            { domain },
            { updated_at: 1 }
        ).lean();

        if (!timestampCheck) {
            // Domain doesn't exist, clear any cached timestamp
            domainTimestampCache.delete(domain);
            return null;
        }

        const dbTimestamp = timestampCheck.updated_at;
        const cachedTimestamp = domainTimestampCache.get(domain);

        // If timestamp has changed since last check, clear all caches
        if (
            !cachedTimestamp ||
            dbTimestamp.getTime() !== cachedTimestamp.getTime()
        ) {
            // Clear all cache layers for this domain
            await clearDomainCachesForDatabase(domain);

            // Update our timestamp cache
            domainTimestampCache.set(domain, new Date(dbTimestamp));
        }

        // Now get the full domain configuration
        const domainConfig = await CustomDomains.findOne({ domain }).lean();
        return domainConfig;
    } catch (error) {
        console.error(`Error in getDomainWithCacheCheck for ${domain}:`, error);
        return null;
    }
}

/**
 * Clear all cache layers for a domain due to database changes
 */
async function clearDomainCachesForDatabase(domain: string): Promise<void> {
    const { clearDomainCache } = await import("../middleware/domainDetection");

    try {
        // Clear domain detection middleware cache
        await clearDomainCache(domain);

        // Clear Redis cache keys for this domain
        const storage = useStorage();
        const cacheKeys = [
            `nitro:functions:api:domains:lookup.get:${domain}`,
            `nitro:functions:api:entities:${domain}`,
        ];

        for (const key of cacheKeys) {
            try {
                await storage.removeItem(key);
            } catch (error) {
                // Silent error handling for cache clearing
            }
        }

        // Success - caches cleared
    } catch (error) {
        console.error(`Error clearing caches for domain ${domain}:`, error);
    }
}

/**
 * Initialize timestamp cache for a domain
 * Call this when domain is first accessed
 */
export function initDomainTimestampCache(
    domain: string,
    timestamp: Date
): void {
    domainTimestampCache.set(domain, new Date(timestamp));
}

/**
 * Force clear timestamp cache for a domain
 * Useful for manual cache invalidation
 */
export function clearDomainTimestampCache(domain?: string): void {
    if (domain) {
        domainTimestampCache.delete(domain);
    } else {
        domainTimestampCache.clear();
    }
}

/**
 * Get cached timestamp for debugging
 */
export function getDomainTimestampCache(): Map<string, Date> {
    return new Map(domainTimestampCache);
}

/**
 * Hook to automatically clear timestamp cache when domain is updated
 * Should be called after domain database updates
 */
export async function invalidateDomainCache(domain: string): Promise<void> {
    // Clear timestamp cache to force fresh check
    clearDomainTimestampCache(domain);

    // Clear all other cache layers
    await clearDomainCachesForDatabase(domain);
}
