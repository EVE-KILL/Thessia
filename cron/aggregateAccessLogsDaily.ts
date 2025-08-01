import {
    compileAccessLogStats,
    getStartOfDay,
} from "../server/helpers/AccessLogStatsCompiler";
import { cliLogger } from "../server/helpers/Logger";
import { AccessLogStats } from "../server/models/AccessLogStats";

export default {
    name: "aggregateAccessLogsDaily",
    description: "Aggregates hourly access log stats into daily statistics",
    schedule: "0 1 * * *", // Run at 1:00 AM every day
    run: async () => {
        cliLogger.info("Starting daily access log aggregation...");

        try {
            // Process the previous day
            const now = new Date();
            const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
            const startOfDay = getStartOfDay(yesterday);
            const endOfDay = new Date(
                startOfDay.getTime() + 24 * 60 * 60 * 1000
            ); // +24 hours

            cliLogger.info(
                `Aggregating daily stats for ${
                    startOfDay.toISOString().split("T")[0]
                }`
            );

            // Check if this day has already been processed
            const existingStats = await AccessLogStats.findOne({
                aggregationType: "daily",
                date: startOfDay,
                hour: { $exists: false }, // Daily stats don't have hour field
            });

            if (existingStats) {
                cliLogger.info(
                    `Daily stats for ${
                        startOfDay.toISOString().split("T")[0]
                    } already exist, skipping...`
                );
                return;
            }

            // Get hourly stats for this day
            const hourlyStats = await AccessLogStats.find({
                aggregationType: "hourly",
                date: {
                    $gte: startOfDay,
                    $lt: endOfDay,
                },
            }).lean();

            cliLogger.info(
                `Found ${hourlyStats.length} hourly stats to aggregate`
            );

            // If no hourly stats exist, create empty daily stats
            if (hourlyStats.length === 0) {
                const emptyDailyStats = compileAccessLogStats(
                    [],
                    "daily",
                    startOfDay
                );
                const statsDoc = new AccessLogStats(emptyDailyStats);
                await statsDoc.save();
                cliLogger.info(
                    `✅ Created empty daily stats for ${
                        startOfDay.toISOString().split("T")[0]
                    }`
                );
                return;
            }

            // Aggregate hourly stats into daily stats
            const aggregatedStats = aggregateHourlyStatsToDaily(
                hourlyStats,
                startOfDay
            );

            // Save daily stats
            const statsDoc = new AccessLogStats(aggregatedStats);
            await statsDoc.save();

            cliLogger.info(
                `✅ Daily aggregation completed: ${hourlyStats.length} hourly stats → 1 daily stat record`
            );
        } catch (error) {
            cliLogger.error(
                `❌ Error during daily access log aggregation: ${error}`
            );
        }
    },
};

/**
 * Aggregate multiple hourly stats into a single daily stat
 */
function aggregateHourlyStatsToDaily(hourlyStats: any[], date: Date): any {
    if (hourlyStats.length === 0) {
        return compileAccessLogStats([], "daily", date);
    }

    // Initialize aggregated stats
    const aggregated = {
        date,
        aggregationType: "daily" as const,
        processedAt: new Date(),
        rawLogCount: 0,
        totalRequests: 0,
        uniqueIps: 0,
        totalErrors: 0,
        totalBytes: 0,
        avgResponseTime: 0,
        maxResponseTime: 0,
        minResponseTime: Number.MAX_VALUE,
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
        topEndpoints: [] as any[],
        topIps: [] as any[],
        topUserAgents: [] as any[],
        errorSamples: [] as any[],
    };

    // Track data for aggregation
    const allIps = new Set<string>();
    const endpointCounts = new Map<
        string,
        { count: number; totalResponseTime: number }
    >();
    const ipCounts = new Map<string, { count: number; isBot: boolean }>();
    const userAgentCounts = new Map<
        string,
        { count: number; isBot: boolean }
    >();
    const allErrors: any[] = [];
    const responseTimes: number[] = [];

    // Aggregate each hourly stat
    for (const hourlyData of hourlyStats) {
        aggregated.rawLogCount += hourlyData.rawLogCount || 0;
        aggregated.totalRequests += hourlyData.totalRequests || 0;
        aggregated.totalErrors += hourlyData.totalErrors || 0;
        aggregated.totalBytes += hourlyData.totalBytes || 0;
        aggregated.apiRequests += hourlyData.apiRequests || 0;
        aggregated.webRequests += hourlyData.webRequests || 0;
        aggregated.botRequests += hourlyData.botRequests || 0;
        aggregated.humanRequests += hourlyData.humanRequests || 0;

        // Method breakdown
        Object.keys(aggregated.methodBreakdown).forEach((method) => {
            (aggregated.methodBreakdown as any)[method] +=
                hourlyData.methodBreakdown?.[method] || 0;
        });

        // Status breakdown
        Object.keys(aggregated.statusBreakdown).forEach((status) => {
            (aggregated.statusBreakdown as any)[status] +=
                hourlyData.statusBreakdown?.[status] || 0;
        });

        // Track response times for average calculation
        if (hourlyData.avgResponseTime && hourlyData.totalRequests) {
            const totalTime =
                hourlyData.avgResponseTime * hourlyData.totalRequests;
            responseTimes.push(totalTime);
        }

        // Max/min response times
        if (hourlyData.maxResponseTime > aggregated.maxResponseTime) {
            aggregated.maxResponseTime = hourlyData.maxResponseTime;
        }
        if (
            hourlyData.minResponseTime > 0 &&
            hourlyData.minResponseTime < aggregated.minResponseTime
        ) {
            aggregated.minResponseTime = hourlyData.minResponseTime;
        }

        // Aggregate top endpoints
        hourlyData.topEndpoints?.forEach((endpoint: any) => {
            const existing = endpointCounts.get(endpoint.url) || {
                count: 0,
                totalResponseTime: 0,
            };
            existing.count += endpoint.count;
            existing.totalResponseTime +=
                endpoint.avgResponseTime * endpoint.count;
            endpointCounts.set(endpoint.url, existing);
        });

        // Aggregate top IPs
        hourlyData.topIps?.forEach((ip: any) => {
            allIps.add(ip.ip);
            const existing = ipCounts.get(ip.ip) || {
                count: 0,
                isBot: ip.isBot,
            };
            existing.count += ip.count;
            ipCounts.set(ip.ip, existing);
        });

        // Aggregate top user agents
        hourlyData.topUserAgents?.forEach((ua: any) => {
            const existing = userAgentCounts.get(ua.userAgent) || {
                count: 0,
                isBot: ua.isBot,
            };
            existing.count += ua.count;
            userAgentCounts.set(ua.userAgent, existing);
        });

        // Collect error samples
        hourlyData.errorSamples?.forEach((error: any) => {
            if (allErrors.length < 10) {
                // Limit daily error samples
                allErrors.push(error);
            }
        });
    }

    // Calculate final values
    aggregated.uniqueIps = allIps.size;

    if (responseTimes.length > 0) {
        const totalResponseTime = responseTimes.reduce((a, b) => a + b, 0);
        aggregated.avgResponseTime =
            totalResponseTime / aggregated.totalRequests || 0;
    }

    if (aggregated.minResponseTime === Number.MAX_VALUE) {
        aggregated.minResponseTime = 0;
    }

    // Generate final top lists
    aggregated.topEndpoints = Array.from(endpointCounts.entries())
        .map(([url, data]) => ({
            url,
            count: data.count,
            avgResponseTime: data.totalResponseTime / data.count || 0,
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 20);

    aggregated.topIps = Array.from(ipCounts.entries())
        .map(([ip, data]) => ({
            ip,
            count: data.count,
            isBot: data.isBot,
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 20);

    aggregated.topUserAgents = Array.from(userAgentCounts.entries())
        .map(([userAgent, data]) => ({
            userAgent,
            count: data.count,
            isBot: data.isBot,
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 20);

    aggregated.errorSamples = allErrors;

    return aggregated;
}
