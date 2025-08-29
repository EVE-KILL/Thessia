/**
 * Composable for coordinated domain cache management
 * Manages both Pinia store cache and useFetch cache invalidation
 */
export const useDomainCacheInvalidation = () => {
    const domainStore = useDomainSettingsStore();

    // Global reactive cache key for all domain-related useFetch calls
    const globalDomainCacheKey = useState<number>("domain-cache-key", () =>
        Date.now()
    );

    /**
     * Increment the global cache key to invalidate all domain-related useFetch calls
     */
    const incrementCacheKey = () => {
        globalDomainCacheKey.value = Date.now();
        console.log(
            `[Domain Cache Invalidation] Global cache key updated: ${globalDomainCacheKey.value}`
        );
    };

    /**
     * Comprehensive domain cache invalidation
     * Clears both Pinia store cache and component useFetch caches
     */
    const invalidateAllDomainCaches = async (domain?: string) => {
        console.log(
            `[Domain Cache Invalidation] Starting comprehensive cache invalidation${
                domain ? ` for ${domain}` : ""
            }`
        );

        // 1. Clear server-side caches (Redis)
        try {
            await $fetch("/api/domains/cache/clear", {
                query: {
                    domain: domain || "all",
                    comprehensive: "true",
                },
                timeout: 10000,
            });
            console.log(
                `[Domain Cache Invalidation] Server cache cleared successfully`
            );
        } catch (error) {
            console.warn(
                `[Domain Cache Invalidation] Failed to clear server cache:`,
                error
            );
        }

        // 2. Clear Pinia store cache
        domainStore.resetSettings();
        console.log(`[Domain Cache Invalidation] Pinia store cache cleared`);

        // 3. Invalidate all component useFetch caches
        incrementCacheKey();

        // 4. If specific domain, reload it
        if (domain && domainStore.currentDomain === domain) {
            try {
                await domainStore.loadDomainSettings(domain, true);
                console.log(
                    `[Domain Cache Invalidation] Reloaded domain settings for ${domain}`
                );
            } catch (error) {
                console.warn(
                    `[Domain Cache Invalidation] Failed to reload domain settings:`,
                    error
                );
            }
        }

        console.log(
            `[Domain Cache Invalidation] Comprehensive cache invalidation complete`
        );
    };

    /**
     * Invalidate caches for a specific domain after entity changes
     */
    const invalidateDomainAfterEntityChange = async (domain: string) => {
        console.log(
            `[Domain Cache Invalidation] Invalidating caches after entity change for: ${domain}`
        );
        await invalidateAllDomainCaches(domain);
    };

    /**
     * Invalidate caches after domain settings update
     */
    const invalidateDomainAfterSettingsChange = async (domain: string) => {
        console.log(
            `[Domain Cache Invalidation] Invalidating caches after settings change for: ${domain}`
        );
        await invalidateAllDomainCaches(domain);
    };

    /**
     * Get cache-busted key for useFetch calls
     */
    const getCacheBustedKey = (baseKey: string) => {
        return `${baseKey}-${globalDomainCacheKey.value}`;
    };

    return {
        globalDomainCacheKey: readonly(globalDomainCacheKey),
        incrementCacheKey,
        invalidateAllDomainCaches,
        invalidateDomainAfterEntityChange,
        invalidateDomainAfterSettingsChange,
        getCacheBustedKey,
    };
};
