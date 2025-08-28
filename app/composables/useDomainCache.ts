/**
 * Composable for managing domain settings cache
 * Provides utilities to force refresh domain settings when needed
 */
export const useDomainCache = () => {
    const domainStore = useDomainSettingsStore();

    /**
     * Force refresh the current domain settings from the server
     * This bypasses any client-side caching
     */
    const refreshCurrentDomain = async () => {
        try {
            await domainStore.refreshDomainSettings();
            console.log(
                "[Domain Cache] Successfully refreshed current domain settings"
            );
            return true;
        } catch (error) {
            console.error(
                "[Domain Cache] Failed to refresh domain settings:",
                error
            );
            return false;
        }
    };

    /**
     * Force refresh specific domain settings
     * @param domain - The domain name to refresh
     */
    const refreshDomain = async (domain: string) => {
        try {
            await domainStore.loadDomainSettings(domain, true);
            console.log(
                `[Domain Cache] Successfully refreshed settings for domain: ${domain}`
            );
            return true;
        } catch (error) {
            console.error(
                `[Domain Cache] Failed to refresh settings for domain ${domain}:`,
                error
            );
            return false;
        }
    };

    /**
     * Clear all cached domain settings and reset the store
     */
    const clearCache = () => {
        domainStore.resetSettings();
        console.log("[Domain Cache] Cleared all cached domain settings");
    };

    /**
     * Clear middleware cache for a specific domain
     * @param domain - The domain name to clear cache for
     * @param comprehensive - Whether to clear both middleware and Redis caches (default: true)
     */
    const clearMiddlewareCache = async (
        domain: string,
        comprehensive = true
    ) => {
        try {
            await $fetch("/api/domains/cache/clear", {
                query: {
                    domain,
                    comprehensive: comprehensive.toString(),
                },
            });
            console.log(
                `[Domain Cache] Cleared ${
                    comprehensive ? "ALL" : "middleware"
                } cache for domain: ${domain}`
            );
            return true;
        } catch (error) {
            console.error(
                `[Domain Cache] Failed to clear cache for domain ${domain}:`,
                error
            );
            return false;
        }
    };

    /**
     * Clear all middleware cache
     */
    const clearAllMiddlewareCache = async () => {
        try {
            await $fetch("/api/domains/cache/clear", {
                query: { all: "true" },
            });
            console.log("[Domain Cache] Cleared all middleware cache");
            return true;
        } catch (error) {
            console.error(
                "[Domain Cache] Failed to clear all middleware cache:",
                error
            );
            return false;
        }
    };

    /**
     * Full cache refresh - clears both store and middleware cache, then reloads
     * @param domain - The domain name to refresh
     */
    const fullRefresh = async (domain: string) => {
        try {
            // Clear middleware cache first
            await clearMiddlewareCache(domain);
            // Then force refresh domain settings
            await refreshDomain(domain);
            console.log(
                `[Domain Cache] Full refresh completed for domain: ${domain}`
            );
            return true;
        } catch (error) {
            console.error(
                `[Domain Cache] Full refresh failed for domain ${domain}:`,
                error
            );
            return false;
        }
    };

    return {
        refreshCurrentDomain,
        refreshDomain,
        clearCache,
        clearMiddlewareCache,
        clearAllMiddlewareCache,
        fullRefresh,
    };
};
