import { Config } from "../models/Config";
import type { IConfig } from "../interfaces/IConfig";

/**
 * Rate limiting configuration and utility functions for the export API
 */

interface IRateLimitConfig {
    requestsPerSecond: number;
    maxBurstRequests: number;
}

interface IRateLimitState {
    requests: number[];
    lastCleanup: number;
}

// In-memory rate limiting store (consider Redis for production)
const rateLimitStore = new Map<string, IRateLimitState>();

/**
 * Determines rate limit based on the requested limit parameter
 */
export function getRateLimitForRequestSize(limit: number): IRateLimitConfig {
    if (limit >= 10000) {
        return { requestsPerSecond: 1, maxBurstRequests: 2 };
    } else if (limit >= 1000) {
        return { requestsPerSecond: 5, maxBurstRequests: 10 };
    } else if (limit >= 100) {
        return { requestsPerSecond: 10, maxBurstRequests: 20 };
    } else {
        return { requestsPerSecond: 100, maxBurstRequests: 200 };
    }
}

/**
 * Checks if an IP is whitelisted in the config
 */
export async function isIpWhitelisted(ip: string): Promise<boolean> {
    try {
        const config = (await Config.findOne({
            key: "export_ip_whitelist",
        }).lean()) as IConfig | null;
        if (!config?.value) {
            return false;
        }

        const whitelistedIps = config.value
            .split(",")
            .map((ip: string) => ip.trim());
        return whitelistedIps.includes(ip);
    } catch (error) {
        console.error("Error checking IP whitelist:", error);
        return false;
    }
}

/**
 * Cleans up old requests from the rate limit state
 */
function cleanupOldRequests(state: IRateLimitState, windowMs: number): void {
    const now = Date.now();
    const cutoff = now - windowMs;

    // Remove requests older than the window
    state.requests = state.requests.filter((timestamp) => timestamp > cutoff);
    state.lastCleanup = now;
}

/**
 * Checks if a request should be rate limited
 * Returns { allowed: boolean, rateLimitInfo: object }
 */
export async function checkRateLimit(
    ip: string,
    limit: number
): Promise<{
    allowed: boolean;
    rateLimitInfo: {
        requestsInWindow: number;
        maxRequestsPerSecond: number;
        maxBurstRequests: number;
        windowMs: number;
        resetTime: number;
        isWhitelisted: boolean;
    };
}> {
    // Check if IP is whitelisted
    const isWhitelisted = await isIpWhitelisted(ip);
    if (isWhitelisted) {
        return {
            allowed: true,
            rateLimitInfo: {
                requestsInWindow: 0,
                maxRequestsPerSecond: 0,
                maxBurstRequests: 0,
                windowMs: 0,
                resetTime: 0,
                isWhitelisted: true,
            },
        };
    }

    const rateLimitConfig = getRateLimitForRequestSize(limit);
    const windowMs = 1000; // 1 second window
    const now = Date.now();

    // Get or create rate limit state for this IP
    let state = rateLimitStore.get(ip);
    if (!state) {
        state = { requests: [], lastCleanup: now };
        rateLimitStore.set(ip, state);
    }

    // Clean up old requests periodically
    if (now - state.lastCleanup > windowMs / 2) {
        cleanupOldRequests(state, windowMs);
    }

    // Count requests in the current window
    const requestsInWindow = state.requests.filter(
        (timestamp) => timestamp > now - windowMs
    ).length;

    // Check if rate limit is exceeded
    const allowed = requestsInWindow < rateLimitConfig.maxBurstRequests;

    if (allowed) {
        state.requests.push(now);
    }

    return {
        allowed,
        rateLimitInfo: {
            requestsInWindow: requestsInWindow + (allowed ? 1 : 0),
            maxRequestsPerSecond: rateLimitConfig.requestsPerSecond,
            maxBurstRequests: rateLimitConfig.maxBurstRequests,
            windowMs,
            resetTime: Math.ceil((now + windowMs) / 1000),
            isWhitelisted: false,
        },
    };
}

/**
 * Cleans up rate limit store periodically (call this from a background job)
 */
export function cleanupRateLimitStore(): void {
    const now = Date.now();
    const maxAge = 60000; // Keep data for 1 minute

    for (const [ip, state] of rateLimitStore.entries()) {
        if (now - state.lastCleanup > maxAge) {
            rateLimitStore.delete(ip);
        }
    }
}
