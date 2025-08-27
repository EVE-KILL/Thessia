import type { IDomainContext } from "../interfaces/ICustomDomain";

/**
 * Domain caching helper using Redis for high-performance domain lookups
 * Implements intelligent caching with TTL and invalidation strategies
 */

interface CacheStats {
    hits: number;
    misses: number;
    errors: number;
    lastUpdated: Date;
}

class DomainCache {
    private stats: CacheStats = {
        hits: 0,
        misses: 0,
        errors: 0,
        lastUpdated: new Date(),
    };

    // Cache key generators
    private getDomainKey(domain: string): string {
        return `domain:${domain.toLowerCase()}`;
    }

    private getEntityKey(entityType: string, entityId: number): string {
        return `entity:${entityType}:${entityId}`;
    }

    private getDomainListKey(userId: string): string {
        return `user:${userId}:domains`;
    }

    private getAnalyticsKey(domain: string): string {
        return `analytics:${domain}`;
    }

    /**
     * Get domain configuration from cache
     */
    async getDomain(domain: string): Promise<IDomainContext | null> {
        try {
            const key = this.getDomainKey(domain);
            const cached = await useStorage("redis").getItem<IDomainContext>(
                key
            );

            if (cached) {
                this.stats.hits++;
                return cached;
            }

            this.stats.misses++;
            return null;
        } catch (error) {
            this.stats.errors++;
            console.error("Domain cache get error:", error);
            return null;
        }
    }

    /**
     * Set domain configuration in cache
     */
    async setDomain(
        domain: string,
        context: IDomainContext,
        ttl: number = 3600
    ): Promise<void> {
        try {
            const key = this.getDomainKey(domain);
            await useStorage("redis").setItem(key, context, {
                ttl, // 1 hour default TTL
            });

            // Also cache by entity for reverse lookups
            if (context.entity) {
                const entityKey = this.getEntityKey(
                    context.entityType,
                    context.entity.id
                );
                await useStorage("redis").setItem(
                    entityKey,
                    {
                        domain,
                        lastCached: new Date(),
                    },
                    { ttl }
                );
            }
        } catch (error) {
            this.stats.errors++;
            console.error("Domain cache set error:", error);
        }
    }

    /**
     * Invalidate domain cache
     */
    async invalidateDomain(domain: string): Promise<void> {
        try {
            const key = this.getDomainKey(domain);

            // Get current context to find entity key
            const context = await this.getDomain(domain);

            // Remove domain cache
            await useStorage("redis").removeItem(key);

            // Remove entity reverse lookup cache
            if (context?.entity) {
                const entityKey = this.getEntityKey(
                    context.entityType,
                    context.entity.id
                );
                await useStorage("redis").removeItem(entityKey);
            }

            // Remove analytics cache
            const analyticsKey = this.getAnalyticsKey(domain);
            await useStorage("redis").removeItem(analyticsKey);
        } catch (error) {
            this.stats.errors++;
            console.error("Domain cache invalidation error:", error);
        }
    }

    /**
     * Get user's domain list from cache
     */
    async getUserDomains(userId: string): Promise<any[] | null> {
        try {
            const key = this.getDomainListKey(userId);
            const cached = await useStorage("redis").getItem<any[]>(key);

            if (cached) {
                this.stats.hits++;
                return cached;
            }

            this.stats.misses++;
            return null;
        } catch (error) {
            this.stats.errors++;
            console.error("User domains cache get error:", error);
            return null;
        }
    }

    /**
     * Set user's domain list in cache
     */
    async setUserDomains(
        userId: string,
        domains: any[],
        ttl: number = 1800
    ): Promise<void> {
        try {
            const key = this.getDomainListKey(userId);
            await useStorage("redis").setItem(key, domains, {
                ttl, // 30 minutes default TTL
            });
        } catch (error) {
            this.stats.errors++;
            console.error("User domains cache set error:", error);
        }
    }

    /**
     * Invalidate user's domain list cache
     */
    async invalidateUserDomains(userId: string): Promise<void> {
        try {
            const key = this.getDomainListKey(userId);
            await useStorage("redis").removeItem(key);
        } catch (error) {
            this.stats.errors++;
            console.error("User domains cache invalidation error:", error);
        }
    }

    /**
     * Cache domain analytics data
     */
    async setDomainAnalytics(
        domain: string,
        analytics: any,
        ttl: number = 900
    ): Promise<void> {
        try {
            const key = this.getAnalyticsKey(domain);
            await useStorage("redis").setItem(
                key,
                {
                    ...analytics,
                    lastUpdated: new Date(),
                },
                { ttl }
            ); // 15 minutes TTL for analytics
        } catch (error) {
            this.stats.errors++;
            console.error("Domain analytics cache set error:", error);
        }
    }

    /**
     * Get domain analytics from cache
     */
    async getDomainAnalytics(domain: string): Promise<any | null> {
        try {
            const key = this.getAnalyticsKey(domain);
            const cached = await useStorage("redis").getItem<any>(key);

            if (cached) {
                this.stats.hits++;
                return cached;
            }

            this.stats.misses++;
            return null;
        } catch (error) {
            this.stats.errors++;
            console.error("Domain analytics cache get error:", error);
            return null;
        }
    }

    /**
     * Bulk invalidate domains by pattern
     */
    async invalidatePattern(pattern: string): Promise<void> {
        try {
            // This would require Redis SCAN command or similar
            // Implementation depends on the storage driver capabilities
            console.log(`Bulk invalidating pattern: ${pattern}`);
        } catch (error) {
            this.stats.errors++;
            console.error("Bulk invalidation error:", error);
        }
    }

    /**
     * Warm up cache with frequently accessed domains
     */
    async warmupCache(domains: string[]): Promise<void> {
        console.log(`Warming up cache for ${domains.length} domains`);

        for (const domain of domains) {
            try {
                // This would fetch from database and cache
                // Implementation would depend on your data layer
                console.log(`Warming up domain: ${domain}`);
            } catch (error) {
                console.error(`Failed to warm up domain ${domain}:`, error);
            }
        }
    }

    /**
     * Get cache statistics
     */
    getStats(): CacheStats {
        return {
            ...this.stats,
            lastUpdated: new Date(),
        };
    }

    /**
     * Reset cache statistics
     */
    resetStats(): void {
        this.stats = {
            hits: 0,
            misses: 0,
            errors: 0,
            lastUpdated: new Date(),
        };
    }

    /**
     * Health check for cache system
     */
    async healthCheck(): Promise<{
        healthy: boolean;
        latency?: number;
        error?: string;
    }> {
        const start = Date.now();
        try {
            const testKey = "health:check";
            const testValue = { timestamp: Date.now() };

            await useStorage("redis").setItem(testKey, testValue, { ttl: 60 });
            const retrieved = await useStorage("redis").getItem(testKey);
            await useStorage("redis").removeItem(testKey);

            const latency = Date.now() - start;

            return {
                healthy: !!retrieved,
                latency,
            };
        } catch (error) {
            return {
                healthy: false,
                latency: Date.now() - start,
                error: error instanceof Error ? error.message : "Unknown error",
            };
        }
    }
}

// Export singleton instance
export const domainCache = new DomainCache();

// Export cache middleware for automatic caching
export const withDomainCache = async <T>(
    key: string,
    fetchFn: () => Promise<T>,
    ttl: number = 3600
): Promise<T> => {
    try {
        // Try cache first
        const cached = await useStorage("redis").getItem<T>(key);
        if (cached) {
            return cached;
        }

        // Fetch fresh data
        const fresh = await fetchFn();

        // Cache the result
        await useStorage("redis").setItem(key, fresh, { ttl });

        return fresh;
    } catch (error) {
        console.error("Cache middleware error:", error);
        // Fallback to direct fetch
        return await fetchFn();
    }
};

// Export cache invalidation helper
export const invalidateUserCache = async (userId: string): Promise<void> => {
    await domainCache.invalidateUserDomains(userId);

    // Also invalidate any user-specific patterns
    await domainCache.invalidatePattern(`user:${userId}:*`);
};

// Export domain-specific invalidation
export const invalidateDomainCache = async (domain: string): Promise<void> => {
    await domainCache.invalidateDomain(domain);
};
