import {
    clearAllDomainCache,
    clearAllDomainCaches,
    clearDomainCache,
} from "../../../middleware/domainDetection";

export default defineEventHandler(async (event) => {
    const query = getQuery(event as any);
    const domain = query.domain as string;
    const all = query.all === "true";
    const comprehensive = query.comprehensive !== "false"; // Default to comprehensive clearing

    if (all) {
        // Clear all domain cache
        clearAllDomainCache();
        console.log("[Cache Clear API] Cleared all domain middleware cache");
        return {
            success: true,
            message: "Cleared all domain cache entries",
            cleared: "all",
        };
    } else if (domain) {
        // Clear specific domain cache
        const normalizedDomain = domain.toLowerCase().trim();

        if (comprehensive) {
            // Clear both middleware and Redis caches
            await clearAllDomainCaches(normalizedDomain);
            console.log(
                `[Cache Clear API] Cleared ALL caches (middleware + Redis) for domain: ${normalizedDomain}`
            );
            return {
                success: true,
                message: `Cleared all caches for domain: ${normalizedDomain}`,
                cleared: normalizedDomain,
                type: "comprehensive",
            };
        } else {
            // Clear only middleware cache
            clearDomainCache(normalizedDomain);
            console.log(
                `[Cache Clear API] Cleared middleware cache for domain: ${normalizedDomain}`
            );
            return {
                success: true,
                message: `Cleared middleware cache for domain: ${normalizedDomain}`,
                cleared: normalizedDomain,
                type: "middleware-only",
            };
        }
    } else {
        throw createError({
            statusCode: 400,
            statusMessage:
                "Either 'domain' parameter or 'all=true' is required",
        });
    }
});
