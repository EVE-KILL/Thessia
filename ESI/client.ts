import { EsiClient, type EsiResponse } from "@localisprimary/esi";
import type Redis from "ioredis";
import { cliLogger } from "../server/helpers/Logger";
import { RedisStorage } from "../server/helpers/Storage";

interface CacheEntry<T> {
    expires: number;
    data: T;
}

interface EsiClientConfig {
    userAgent?: string;
    token?: string;
}

export class CachedEsiClient {
    private client: EsiClient;
    private redis: Redis;
    private userAgent: string;
    private rateLimit: number = Number(process.env.ESI_RATE_LIMIT) || 25;

    constructor(config: EsiClientConfig = {}) {
        this.userAgent = config.userAgent || "Thessia/1.0 (eve-kill.com)";

        this.client = new EsiClient({
            token: config.token,
            userAgent: this.userAgent,
            useRequestHeaders: true, // Important to get headers back
        });

        // Use existing RedisStorage singleton
        this.redis = RedisStorage.getInstance().getClient();
    }

    /**
     * Sleep utility function
     */
    private sleep(ms: number): Promise<void> {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }

    /**
     * Rate limiting based on global counter
     */
    private async checkRateLimit(): Promise<void> {
        const key = "esi:global_rate_limit_counter";
        const count = await this.redis.incr(key);

        // Set the key to expire after 1 second if it's the first increment
        if (count === 1) {
            await this.redis.expire(key, 1);
        }

        // If we've exceeded the limit, wait for the key to expire
        if (count > this.rateLimit) {
            await this.sleep(1000);
        }
    }

    /**
     * Check if TQ is offline or fetcher is paused
     */
    private async checkTQStatus(): Promise<void> {
        // Check if TQ is offline
        const tqOffline = (await this.redis.get("tqStatus")) === "offline";
        if (tqOffline) {
            cliLogger.warn("TQ is offline. Sleeping for 30 seconds...");
            await this.sleep(30000);
            throw new Error("TQ is offline, fetcher cannot proceed.");
        }

        // Check if fetcher is paused
        const fetcherPausedUntil = await this.redis.get("fetcher_paused");
        const fetcherPaused =
            fetcherPausedUntil && Number(fetcherPausedUntil) > Date.now();
        if (fetcherPaused) {
            const pauseUntil = new Date(
                Number(fetcherPausedUntil)
            ).toISOString();
            const sleepTime = Number(fetcherPausedUntil) - Date.now();
            cliLogger.warn(
                `Fetcher is paused until ${pauseUntil}. Sleeping for ${sleepTime}ms...`
            );
            await this.sleep(sleepTime);
        }
    }

    /**
     * Create a cache key from method name and arguments
     */
    private createCacheKey(method: string, args: any[]): string {
        const argString = args.length > 0 ? JSON.stringify(args) : "";
        return `esi:${method}:${argString}`;
    }

    /**
     * Get data from cache
     */
    private async getFromCache<T>(key: string): Promise<CacheEntry<T> | null> {
        try {
            const cached = await this.redis.get(key);
            if (cached) {
                return JSON.parse(cached) as CacheEntry<T>;
            }
        } catch (error) {
            cliLogger.warn(`Cache get error for key ${key}: ${error}`);
        }
        return null;
    }

    /**
     * Store data in cache
     */
    private async storeInCache<T>(
        key: string,
        data: T,
        expiresAt: number
    ): Promise<void> {
        try {
            const entry: CacheEntry<T> = {
                expires: expiresAt,
                data,
            };

            const ttl = Math.max(
                1,
                Math.floor((expiresAt - Date.now()) / 1000)
            );
            await this.redis.setex(key, ttl, JSON.stringify(entry));
        } catch (error) {
            cliLogger.warn(`Cache store error for key ${key}: ${error}`);
        }
    }

    /**
     * Check ESI error limits and back off if necessary with intelligent exponential backoff
     */
    private async checkErrorLimits(): Promise<void> {
        try {
            const errorLimitRemain = await this.redis.get(
                "esi:error_limit_remain"
            );
            const errorLimitReset = await this.redis.get(
                "esi:error_limit_reset"
            );

            if (errorLimitRemain && parseInt(errorLimitRemain, 10) < 100) {
                const remainingErrors = parseInt(errorLimitRemain, 10);
                const resetSeconds = errorLimitReset
                    ? parseInt(errorLimitReset, 10)
                    : 0;

                // Calculate exponential backoff based on remaining errors
                // As errors approach 0, sleep time increases exponentially
                const remainingErrorPercentage = remainingErrors / 100;
                const baseTime = 200; // 200ms base
                const maxBackoffFactor = 120; // Maximum power factor

                const backoffFactor =
                    maxBackoffFactor ** (1 - remainingErrorPercentage);
                let sleepTimeInMilliseconds = Math.min(
                    baseTime * backoffFactor,
                    resetSeconds * 1000
                );

                // Ensure minimum sleep time of 100ms
                sleepTimeInMilliseconds = Math.max(
                    100,
                    sleepTimeInMilliseconds
                );

                cliLogger.debug(
                    `ESI backoff: Remaining=${remainingErrors}, Reset=${resetSeconds}s. Sleeping for ${sleepTimeInMilliseconds}ms`
                );
                await this.sleep(sleepTimeInMilliseconds);
            }
        } catch (error) {
            // Ignore cache errors for error limit checking, but log them
            cliLogger.debug(`Error checking ESI error limits: ${error}`);
        }
    }

    /**
     * Update ESI error limit tracking
     */
    private async updateErrorLimits(
        headers: Record<string, string>
    ): Promise<void> {
        try {
            if (headers["x-esi-error-limit-remain"]) {
                await this.redis.setex(
                    "esi:error_limit_remain",
                    300,
                    headers["x-esi-error-limit-remain"]
                );
            }
            if (headers["x-esi-error-limit-reset"]) {
                const resetTime =
                    Date.now() / 1000 +
                    parseInt(headers["x-esi-error-limit-reset"], 10);
                await this.redis.setex(
                    "esi:error_limit_reset",
                    300,
                    resetTime.toString()
                );
            }
        } catch (error) {
            cliLogger.warn(`Error updating ESI error limits: ${error}`);
        }
    }

    /**
     * Cached ESI request wrapper with intelligent error handling
     */
    private async cachedRequest<T>(
        method: string,
        originalMethod: Function,
        args: any[]
    ): Promise<EsiResponse<T>> {
        const cacheKey = this.createCacheKey(method, args);

        // Try cache first
        const cached = await this.getFromCache<EsiResponse<T>>(cacheKey);
        if (cached && Date.now() < cached.expires) {
            cliLogger.debug(`[ESI Cache] HIT for ${method}`);
            return cached.data;
        }

        cliLogger.debug(`[ESI Cache] MISS for ${method}`);

        // Check TQ status and fetcher pause state
        await this.checkTQStatus();

        // Apply rate limiting
        await this.checkRateLimit();

        // Check error limits with intelligent backoff
        await this.checkErrorLimits();

        try {
            // Make the actual ESI request
            const result = (await originalMethod.apply(
                this.client,
                args
            )) as EsiResponse<T>;

            // Update error limit tracking
            await this.updateErrorLimits(result.headers);

            // Cache the result if it has an expires header
            if (result.headers.expires) {
                const expires = new Date(result.headers.expires).getTime();
                if (expires > Date.now()) {
                    await this.storeInCache(cacheKey, result, expires);
                }
            }

            return result;
        } catch (error: any) {
            // Handle 420 rate limit responses
            if (error.response?.status === 420) {
                const sleepTime = 60;
                cliLogger.warn(
                    `Status 420 received for ${method}. Sleeping for ${sleepTime}s and pausing fetcher.`
                );

                // Set fetcher_paused so other fetches will pause
                const pauseUntilTimestamp = Date.now() + sleepTime * 1000;
                await this.redis.set(
                    "fetcher_paused",
                    pauseUntilTimestamp.toString()
                );

                await this.sleep(sleepTime * 1000);
                cliLogger.warn(
                    `Status 420: Rate limited. Paused fetcher for ${sleepTime}s.`
                );

                // Retry the request
                return this.cachedRequest(method, originalMethod, args);
            }

            throw error;
        }
    }

    /**
     * Create a proxy that intercepts all get* method calls and adds caching
     */
    private createCachedProxy(): EsiClient {
        return new Proxy(this.client, {
            get: (target, prop: keyof EsiClient) => {
                if (
                    typeof target[prop] === "function" &&
                    prop.toString().startsWith("get")
                ) {
                    return (...args: any[]) => {
                        return this.cachedRequest(
                            prop.toString(),
                            target[prop],
                            args
                        );
                    };
                }
                return target[prop];
            },
        });
    }

    /**
     * Get the cached ESI client
     */
    get esi(): EsiClient {
        return this.createCachedProxy();
    }

    /**
     * Clear cache for a specific pattern
     */
    async clearCache(pattern: string = "esi:*"): Promise<number> {
        try {
            const keys = await this.redis.keys(pattern);
            if (keys.length > 0) {
                return await this.redis.del(...keys);
            }
            return 0;
        } catch (error) {
            cliLogger.error(`Error clearing cache: ${error}`);
            return 0;
        }
    }
}

// Export a default instance
let defaultClient: CachedEsiClient | null = null;

export function getEsiClient(config?: EsiClientConfig): CachedEsiClient {
    if (!defaultClient) {
        defaultClient = new CachedEsiClient(config);
    }
    return defaultClient;
}

// Export types for convenience
export type { EsiResponse } from "@localisprimary/esi";
