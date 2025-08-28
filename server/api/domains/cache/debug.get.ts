import {
    clearDomainTimestampCache,
    getDomainTimestampCache,
} from "../../../utils/domainCacheManager";

export default defineEventHandler(async (event) => {
    const query = getQuery(event);
    const action = query.action as string;
    const domain = query.domain as string;

    if (action === "clear") {
        if (domain) {
            clearDomainTimestampCache(domain);
            return {
                success: true,
                message: `Cleared timestamp cache for domain: ${domain}`,
            };
        } else {
            clearDomainTimestampCache();
            return {
                success: true,
                message: "Cleared all timestamp caches",
            };
        }
    }

    // Default: show current timestamp cache status
    const timestampCache = getDomainTimestampCache();
    const cacheData: Record<string, string> = {};

    for (const [domain, timestamp] of timestampCache.entries()) {
        cacheData[domain] = timestamp.toISOString();
    }

    return {
        success: true,
        timestamp_cache: cacheData,
        cache_size: timestampCache.size,
        message:
            "Use ?action=clear to clear all caches, or ?action=clear&domain=example.com to clear specific domain",
    };
});
