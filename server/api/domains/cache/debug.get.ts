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

    if (action === "keys") {
        // Show Redis cache keys for debugging
        try {
            const redis = useStorage("redis");
            const redisClient = (redis as any).driver?.base?.client;

            if (redisClient?.keys) {
                const patterns = [
                    "domain:*",
                    "nitro:functions:api:domains:*",
                    ...(domain ? [`domain:*:*${domain}*`, `*${domain}*`] : []),
                ];

                const foundKeys: Record<string, string[]> = {};

                for (const pattern of patterns) {
                    try {
                        const keys = await redisClient.keys(pattern);
                        if (keys.length > 0) {
                            foundKeys[pattern] = keys;
                        }
                    } catch (error: any) {
                        foundKeys[pattern] = [
                            `Error: ${error?.message || error}`,
                        ];
                    }
                }

                return {
                    success: true,
                    message: "Redis cache keys found",
                    domain_filter: domain || "all",
                    cache_keys: foundKeys,
                    total_patterns: Object.keys(foundKeys).length,
                };
            } else {
                return {
                    success: false,
                    message: "Redis KEYS command not available",
                };
            }
        } catch (error: any) {
            return {
                success: false,
                message: "Failed to fetch cache keys",
                error: error.message,
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
        available_actions: {
            clear_timestamp: "?action=clear&domain=example.com",
            clear_all_timestamps: "?action=clear",
            show_redis_keys: "?action=keys",
            show_redis_keys_for_domain: "?action=keys&domain=example.com",
        },
        message:
            "Use ?action=clear to clear timestamp caches, or ?action=keys to show Redis cache keys",
    };
});
