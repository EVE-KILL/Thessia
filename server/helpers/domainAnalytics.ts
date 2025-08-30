/**
 * Domain analytics and monitoring system
 * Tracks usage, performance, and health metrics for custom domains
 */

export interface DomainMetrics {
    domain: string;
    timestamp: Date;
    requestCount: number;
    uniqueVisitors: number;
    responseTime: number;
    errorRate: number;
    bandwidth: number;
    topPages: Array<{ path: string; views: number }>;
    referrers: Array<{ source: string; visits: number }>;
    userAgents: Array<{ agent: string; count: number }>;
}

export interface DomainHealthMetrics {
    domain: string;
    uptime: number;
    availability: number;
    averageResponseTime: number;
    errorCount: number;
    lastError?: {
        timestamp: Date;
        error: string;
        statusCode: number;
    };
}

export interface DomainUsageStats {
    domain: string;
    period: "hour" | "day" | "week" | "month";
    totalRequests: number;
    uniqueVisitors: number;
    totalBandwidth: number;
    avgResponseTime: number;
    errorRate: number;
    topPages: Array<{ path: string; views: number }>;
    deviceTypes: Record<string, number>;
    countries: Record<string, number>;
}

class DomainAnalytics {
    private metricsBuffer = new Map<string, DomainMetrics>();
    private readonly bufferSize = 1000;
    private readonly flushInterval = 60000; // 1 minute

    constructor() {
        // Start periodic flush of metrics buffer
        setInterval(() => {
            this.flushMetricsBuffer();
        }, this.flushInterval);
    }

    /**
     * Track a request for analytics
     */
    async trackRequest(
        domain: string,
        request: {
            path: string;
            method: string;
            userAgent?: string;
            referer?: string;
            ip?: string;
            responseTime: number;
            statusCode: number;
            responseSize: number;
        }
    ): Promise<void> {
        try {
            const timestamp = new Date();
            const key = `${domain}:${timestamp.getHours()}`;

            // Get or create metrics for this hour
            let metrics = this.metricsBuffer.get(key);
            if (!metrics) {
                metrics = {
                    domain,
                    timestamp,
                    requestCount: 0,
                    uniqueVisitors: 0,
                    responseTime: 0,
                    errorRate: 0,
                    bandwidth: 0,
                    topPages: [],
                    referrers: [],
                    userAgents: [],
                };
                this.metricsBuffer.set(key, metrics);
            }

            // Update metrics
            metrics.requestCount++;
            metrics.bandwidth += request.responseSize;
            metrics.responseTime =
                (metrics.responseTime + request.responseTime) / 2;

            // Track errors
            if (request.statusCode >= 400) {
                const currentErrorRate =
                    (metrics.errorRate * (metrics.requestCount - 1)) /
                    metrics.requestCount;
                metrics.errorRate = currentErrorRate + 1 / metrics.requestCount;
            }

            // Track page views
            this.updateTopList(metrics.topPages, request.path, 10);

            // Track referrers
            if (request.referer) {
                this.updateTopList(metrics.referrers, request.referer, 5);
            }

            // Track user agents
            if (request.userAgent) {
                this.updateTopList(metrics.userAgents, request.userAgent, 5);
            }

            // Track unique visitors (simplified)
            if (request.ip) {
                await this.trackUniqueVisitor(domain, request.ip);
            }

            // Store in persistent analytics (async)
            this.storeAnalytics(domain, request).catch((error) => {
                console.error("Failed to store analytics:", error);
            });
        } catch (error) {
            console.error("Analytics tracking error:", error);
        }
    }

    /**
     * Update top list (pages, referrers, etc.)
     */
    private updateTopList(
        list: Array<{
            [key: string]: any;
            count?: number;
            views?: number;
            visits?: number;
        }>,
        item: string,
        maxItems: number
    ): void {
        const existing = list.find((l) => Object.values(l)[0] === item);
        if (existing) {
            const countKey = Object.keys(existing).find(
                (key) => key === "count" || key === "views" || key === "visits"
            );
            if (countKey) {
                existing[countKey]++;
            }
        } else {
            const newItem = { [Object.keys(list[0] || { path: "" })[0]]: item };
            const countKey =
                list.length > 0
                    ? Object.keys(list[0]).find(
                          (key) =>
                              key === "count" ||
                              key === "views" ||
                              key === "visits"
                      ) || "count"
                    : "count";
            newItem[countKey] = 1;
            list.push(newItem);
        }

        // Keep only top items
        list.sort((a, b) => {
            const aCount = a.count || a.views || a.visits || 0;
            const bCount = b.count || b.views || b.visits || 0;
            return bCount - aCount;
        });
        list.splice(maxItems);
    }

    /**
     * Track unique visitors
     */
    private async trackUniqueVisitor(
        domain: string,
        ip: string
    ): Promise<void> {
        try {
            const today = new Date().toISOString().split("T")[0];
            const key = `unique_visitors:${domain}:${today}`;

            // Use a simple approach for now - would use Redis sets in production
            const visitorsKey = `${key}:${ip}`;

            // This is a placeholder - would implement with actual storage
        } catch (error) {
            console.error("Unique visitor tracking error:", error);
        }
    }

    /**
     * Store analytics data persistently
     */
    private async storeAnalytics(domain: string, request: any): Promise<void> {
        try {
            // This would store in your analytics database
            // For now, just log
            await this.storeInBuffer(domain, analyticsData);
        } catch (error) {
            console.error("Analytics storage error:", error);
        }
    }

    /**
     * Get analytics for a domain
     */
    async getDomainAnalytics(
        domain: string,
        period: "hour" | "day" | "week" | "month" = "day"
    ): Promise<DomainUsageStats> {
        try {
            // This would query your analytics database
            // For now, return mock data
            return {
                domain,
                period,
                totalRequests: Math.floor(Math.random() * 10000),
                uniqueVisitors: Math.floor(Math.random() * 1000),
                totalBandwidth: Math.floor(Math.random() * 1000000000),
                avgResponseTime: Math.floor(Math.random() * 500),
                errorRate: Math.random() * 0.05,
                topPages: [
                    { path: "/", views: Math.floor(Math.random() * 1000) },
                    {
                        path: "/killboard",
                        views: Math.floor(Math.random() * 500),
                    },
                    { path: "/stats", views: Math.floor(Math.random() * 300) },
                ],
                deviceTypes: {
                    desktop: Math.floor(Math.random() * 600),
                    mobile: Math.floor(Math.random() * 300),
                    tablet: Math.floor(Math.random() * 100),
                },
                countries: {
                    US: Math.floor(Math.random() * 400),
                    EU: Math.floor(Math.random() * 300),
                    AS: Math.floor(Math.random() * 200),
                },
            };
        } catch (error) {
            console.error("Failed to get domain analytics:", error);
            throw error;
        }
    }

    /**
     * Get domain health metrics
     */
    async getDomainHealth(domain: string): Promise<DomainHealthMetrics> {
        try {
            // This would query health monitoring data
            return {
                domain,
                uptime: 99.9,
                availability: 99.5,
                averageResponseTime: Math.floor(Math.random() * 200),
                errorCount: Math.floor(Math.random() * 10),
                lastError:
                    Math.random() > 0.7
                        ? {
                              timestamp: new Date(
                                  Date.now() - Math.random() * 86400000
                              ),
                              error: "Connection timeout",
                              statusCode: 504,
                          }
                        : undefined,
            };
        } catch (error) {
            console.error("Failed to get domain health:", error);
            throw error;
        }
    }

    /**
     * Get real-time metrics for dashboard
     */
    async getRealTimeMetrics(domain: string): Promise<{
        activeUsers: number;
        requestsPerSecond: number;
        responseTime: number;
        errorRate: number;
    }> {
        try {
            // This would get real-time data from monitoring system
            return {
                activeUsers: Math.floor(Math.random() * 100),
                requestsPerSecond: Math.random() * 10,
                responseTime: Math.floor(Math.random() * 300),
                errorRate: Math.random() * 0.01,
            };
        } catch (error) {
            console.error("Failed to get real-time metrics:", error);
            throw error;
        }
    }

    /**
     * Get domain comparison analytics
     */
    async compareDomains(
        domains: string[],
        period: "day" | "week" | "month" = "week"
    ): Promise<Record<string, DomainUsageStats>> {
        try {
            const comparison: Record<string, DomainUsageStats> = {};

            for (const domain of domains) {
                comparison[domain] = await this.getDomainAnalytics(
                    domain,
                    period
                );
            }

            return comparison;
        } catch (error) {
            console.error("Failed to compare domains:", error);
            throw error;
        }
    }

    /**
     * Generate analytics report
     */
    async generateReport(
        domain: string,
        startDate: Date,
        endDate: Date
    ): Promise<{
        summary: DomainUsageStats;
        trends: Array<{ date: string; requests: number; visitors: number }>;
        insights: string[];
    }> {
        try {
            const summary = await this.getDomainAnalytics(domain, "month");

            // Generate trend data
            const trends = [];
            const days = Math.ceil(
                (endDate.getTime() - startDate.getTime()) / 86400000
            );

            for (let i = 0; i < days; i++) {
                const date = new Date(startDate.getTime() + i * 86400000);
                trends.push({
                    date: date.toISOString().split("T")[0],
                    requests: Math.floor(Math.random() * 1000),
                    visitors: Math.floor(Math.random() * 200),
                });
            }

            // Generate insights
            const insights = [
                `Peak traffic occurs between ${Math.floor(
                    Math.random() * 12 + 9
                )}:00 and ${Math.floor(Math.random() * 4 + 16)}:00`,
                `Mobile traffic accounts for ${Math.floor(
                    Math.random() * 40 + 30
                )}% of visits`,
                `Average session duration is ${Math.floor(
                    Math.random() * 5 + 2
                )} minutes`,
                `Error rate is ${
                    summary.errorRate < 0.01
                        ? "excellent"
                        : summary.errorRate < 0.05
                        ? "good"
                        : "needs attention"
                }`,
            ];

            return {
                summary,
                trends,
                insights,
            };
        } catch (error) {
            console.error("Failed to generate report:", error);
            throw error;
        }
    }

    /**
     * Set up alerts for domain monitoring
     */
    async setupAlerts(
        domain: string,
        thresholds: {
            errorRate?: number;
            responseTime?: number;
            downtime?: number;
        }
    ): Promise<void> {
        try {
            // This would configure monitoring alerts

            // Store alert configuration
            const alertConfig = {
                domain,
                thresholds,
                enabled: true,
                createdAt: new Date(),
            };

            // Would persist to database
        } catch (error) {
            console.error("Failed to setup alerts:", error);
        }
    }

    /**
     * Flush metrics buffer to persistent storage
     */
    private async flushMetricsBuffer(): Promise<void> {
        try {
            if (this.metricsBuffer.size === 0) return;

            // Process each metric record
            for (const [key, metrics] of this.metricsBuffer.entries()) {
                // This would save to your analytics database
                await this.persistMetrics(metrics);
            }

            // Clear buffer
            this.metricsBuffer.clear();
        } catch (error) {
            console.error("Failed to flush metrics buffer:", error);
        }
    }

    /**
     * Persist metrics to database
     */
    private async persistMetrics(metrics: DomainMetrics): Promise<void> {
        try {
            // This would save to your analytics database
        } catch (error) {
            console.error("Failed to persist metrics:", error);
        }
    }

    /**
     * Clean up old analytics data
     */
    async cleanupOldData(retentionDays: number = 90): Promise<void> {
        try {
            const cutoffDate = new Date(
                Date.now() - retentionDays * 24 * 60 * 60 * 1000
            );

            // This would delete old records from your analytics database
        } catch (error) {
            console.error("Failed to cleanup old data:", error);
        }
    }
}

// Export singleton instance
export const domainAnalytics = new DomainAnalytics();

// Export middleware for automatic request tracking
export const withAnalytics = async (
    domain: string,
    request: any,
    responseTime: number,
    statusCode: number,
    responseSize: number
) => {
    await domainAnalytics.trackRequest(domain, {
        path: request.url?.pathname || "/",
        method: request.method || "GET",
        userAgent: request.headers?.["user-agent"],
        referer: request.headers?.referer,
        ip:
            request.headers?.["x-forwarded-for"] ||
            request.connection?.remoteAddress,
        responseTime,
        statusCode,
        responseSize,
    });
};
