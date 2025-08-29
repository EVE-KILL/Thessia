import {
    clearDomainCaches,
    clearSpecificDomainCache,
    verifyCacheCleared,
} from "../../../utils/cacheUtils";

export default defineEventHandler(async (event) => {
    const query = getQuery(event as any);
    const domain = query.domain as string;
    const cacheType = query.type as
        | "middleware"
        | "redis"
        | "timestamp"
        | "all"
        | undefined;
    const action = query.action as "clear" | "verify" | undefined;

    if (!domain) {
        throw createError({
            statusCode: 400,
            statusMessage: "Domain parameter is required",
        });
    }

    const normalizedDomain = domain.toLowerCase().trim();

    try {
        if (action === "verify") {
            // Verify cache state
            const verification = await verifyCacheCleared(normalizedDomain);

            return {
                success: true,
                domain: normalizedDomain,
                action: "verify",
                cache_cleared: verification.cleared,
                remaining_keys: verification.remaining_keys,
                timestamp_cache_exists: verification.timestamp_cache,
                message: verification.cleared
                    ? "All domain caches appear to be cleared"
                    : `Found ${verification.remaining_keys.length} remaining cache entries`,
            };
        } else {
            // Clear cache (default action)
            if (cacheType && cacheType !== "all") {
                // Clear specific cache type
                await clearSpecificDomainCache(normalizedDomain, cacheType);

                return {
                    success: true,
                    domain: normalizedDomain,
                    action: "clear",
                    cache_type: cacheType,
                    message: `Cleared ${cacheType} cache for domain: ${normalizedDomain}`,
                };
            } else {
                // Clear all caches (comprehensive)
                await clearDomainCaches(normalizedDomain);

                return {
                    success: true,
                    domain: normalizedDomain,
                    action: "clear",
                    cache_type: "all",
                    message: `Cleared all caches for domain: ${normalizedDomain}`,
                };
            }
        }
    } catch (error: any) {
        console.error(
            `[Cache Test API] Error processing request for ${normalizedDomain}:`,
            error
        );

        throw createError({
            statusCode: 500,
            statusMessage: "Failed to process cache request",
            data: {
                domain: normalizedDomain,
                error: error.message,
            },
        });
    }
});
