import type { IAccessLog } from "../interfaces/IAccessLog";
import type { IAccessLogStats } from "../interfaces/IAccessLogStats";

/**
 * Configuration for stats compilation
 */
export const STATS_CONFIG = {
    topListsLimit: 20, // How many items to keep in top lists
    errorSamplesLimit: 10, // How many error samples to keep
    minResponseTime: 1, // Minimum response time to avoid division by zero
};

/**
 * Compile raw access logs into aggregated statistics
 * @param logs Array of raw access log entries
 * @param aggregationType Whether this is hourly or daily aggregation
 * @param date The date/hour this aggregation covers
 * @param hour Optional hour (0-23) for hourly stats
 */
export function compileAccessLogStats(
    logs: IAccessLog[],
    aggregationType: "hourly" | "daily",
    date: Date,
    hour?: number
): IAccessLogStats {
    if (logs.length === 0) {
        return createEmptyStats(aggregationType, date, hour);
    }

    // Initialize counters
    const stats: Partial<IAccessLogStats> = {
        date,
        hour,
        aggregationType,
        processedAt: new Date(),
        rawLogCount: logs.length,
        totalRequests: logs.length,
        totalErrors: 0,
        totalBytes: 0,
        apiRequests: 0,
        webRequests: 0,
        botRequests: 0,
        humanRequests: 0,
        methodBreakdown: {
            GET: 0,
            POST: 0,
            PUT: 0,
            DELETE: 0,
            PATCH: 0,
            OPTIONS: 0,
            HEAD: 0,
            other: 0,
        },
        statusBreakdown: {
            success: 0,
            redirect: 0,
            clientError: 0,
            serverError: 0,
        },
        topEndpoints: [],
        topIps: [],
        topUserAgents: [],
        errorSamples: [],
    };

    // Tracking objects for aggregation
    const uniqueIps = new Set<string>();
    const endpointCounts = new Map<
        string,
        { count: number; totalResponseTime: number }
    >();
    const ipCounts = new Map<string, { count: number; isBot: boolean }>();
    const userAgentCounts = new Map<
        string,
        { count: number; isBot: boolean }
    >();
    const responseTimes: number[] = [];
    const errors: Array<{
        url: string;
        statusCode: number;
        userAgent: string;
        timestamp: Date;
    }> = [];

    // Process each log entry
    for (const log of logs) {
        // Track unique IPs
        uniqueIps.add(log.clientIp);

        // API vs Web requests
        if (log.isApiRequest) {
            stats.apiRequests!++;
        } else {
            stats.webRequests!++;
        }

        // Bot vs Human requests
        if (log.isBot) {
            stats.botRequests!++;
        } else {
            stats.humanRequests!++;
        }

        // Method breakdown
        const method = log.method.toUpperCase();
        if (method in stats.methodBreakdown!) {
            (stats.methodBreakdown! as any)[method]++;
        } else {
            stats.methodBreakdown!.other++;
        }

        // Status code breakdown
        if (log.statusCode) {
            const statusClass = Math.floor(log.statusCode / 100);
            if (statusClass === 2) {
                stats.statusBreakdown!.success++;
            } else if (statusClass === 3) {
                stats.statusBreakdown!.redirect++;
            } else if (statusClass === 4) {
                stats.statusBreakdown!.clientError++;
                stats.totalErrors!++;
            } else if (statusClass === 5) {
                stats.statusBreakdown!.serverError++;
                stats.totalErrors!++;
            }

            // Collect error samples
            if (
                statusClass >= 4 &&
                errors.length < STATS_CONFIG.errorSamplesLimit
            ) {
                errors.push({
                    url: log.url,
                    statusCode: log.statusCode,
                    userAgent: log.userAgent,
                    timestamp: log.timestamp,
                });
            }
        }

        // Response time tracking
        if (log.responseTime && log.responseTime > 0) {
            responseTimes.push(log.responseTime);
        }

        // Response size tracking
        if (log.responseSize) {
            stats.totalBytes! += log.responseSize;
        }

        // Endpoint counting
        const endpointKey = log.url;
        const endpointData = endpointCounts.get(endpointKey) || {
            count: 0,
            totalResponseTime: 0,
        };
        endpointData.count++;
        if (log.responseTime) {
            endpointData.totalResponseTime += log.responseTime;
        }
        endpointCounts.set(endpointKey, endpointData);

        // IP counting
        const ipData = ipCounts.get(log.clientIp) || {
            count: 0,
            isBot: log.isBot || false,
        };
        ipData.count++;
        ipCounts.set(log.clientIp, ipData);

        // User agent counting
        const uaData = userAgentCounts.get(log.userAgent) || {
            count: 0,
            isBot: log.isBot || false,
        };
        uaData.count++;
        userAgentCounts.set(log.userAgent, uaData);
    }

    // Calculate performance metrics
    stats.uniqueIps = uniqueIps.size;

    if (responseTimes.length > 0) {
        stats.avgResponseTime =
            responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
        stats.maxResponseTime = Math.max(...responseTimes);
        stats.minResponseTime = Math.min(...responseTimes);
    } else {
        stats.avgResponseTime = 0;
        stats.maxResponseTime = 0;
        stats.minResponseTime = 0;
    }

    // Generate top lists
    stats.topEndpoints = Array.from(endpointCounts.entries())
        .map(([url, data]) => ({
            url,
            count: data.count,
            avgResponseTime: data.totalResponseTime / data.count || 0,
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, STATS_CONFIG.topListsLimit);

    stats.topIps = Array.from(ipCounts.entries())
        .map(([ip, data]) => ({
            ip,
            count: data.count,
            isBot: data.isBot,
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, STATS_CONFIG.topListsLimit);

    stats.topUserAgents = Array.from(userAgentCounts.entries())
        .map(([userAgent, data]) => ({
            userAgent,
            count: data.count,
            isBot: data.isBot,
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, STATS_CONFIG.topListsLimit);

    stats.errorSamples = errors;

    return stats as IAccessLogStats;
}

/**
 * Create empty stats object for periods with no data
 */
function createEmptyStats(
    aggregationType: "hourly" | "daily",
    date: Date,
    hour?: number
): IAccessLogStats {
    return {
        date,
        hour,
        aggregationType,
        processedAt: new Date(),
        rawLogCount: 0,
        totalRequests: 0,
        uniqueIps: 0,
        totalErrors: 0,
        totalBytes: 0,
        avgResponseTime: 0,
        maxResponseTime: 0,
        minResponseTime: 0,
        apiRequests: 0,
        webRequests: 0,
        botRequests: 0,
        humanRequests: 0,
        methodBreakdown: {
            GET: 0,
            POST: 0,
            PUT: 0,
            DELETE: 0,
            PATCH: 0,
            OPTIONS: 0,
            HEAD: 0,
            other: 0,
        },
        statusBreakdown: {
            success: 0,
            redirect: 0,
            clientError: 0,
            serverError: 0,
        },
        topEndpoints: [],
        topIps: [],
        topUserAgents: [],
        errorSamples: [],
    };
}

/**
 * Get the start of day for a given date (useful for daily aggregation)
 */
export function getStartOfDay(date: Date): Date {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    return startOfDay;
}

/**
 * Get the start of hour for a given date (useful for hourly aggregation)
 */
export function getStartOfHour(date: Date): Date {
    const startOfHour = new Date(date);
    startOfHour.setMinutes(0, 0, 0);
    return startOfHour;
}
