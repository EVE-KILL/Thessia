export interface IAccessLogStats {
    // Time period this stat covers
    date: Date; // For daily stats, this would be the start of the day
    hour?: number; // For hourly stats (0-23), undefined for daily stats

    // Basic counters
    totalRequests: number;
    uniqueIps: number;
    totalErrors: number;
    totalBytes: number;

    // Performance metrics
    avgResponseTime: number;
    maxResponseTime: number;
    minResponseTime: number;

    // Traffic breakdown
    apiRequests: number;
    webRequests: number;
    botRequests: number;
    humanRequests: number;

    // HTTP methods breakdown
    methodBreakdown: {
        GET: number;
        POST: number;
        PUT: number;
        DELETE: number;
        PATCH: number;
        OPTIONS: number;
        HEAD: number;
        other: number;
    };

    // Status code breakdown
    statusBreakdown: {
        success: number; // 2xx
        redirect: number; // 3xx
        clientError: number; // 4xx
        serverError: number; // 5xx
    };

    // Top lists (limited arrays for storage efficiency)
    topEndpoints: Array<{
        url: string;
        count: number;
        avgResponseTime: number;
    }>;

    topIps: Array<{
        ip: string;
        count: number;
        isBot: boolean;
    }>;

    topUserAgents: Array<{
        userAgent: string;
        count: number;
        isBot: boolean;
    }>;

    // Error samples (for debugging)
    errorSamples: Array<{
        url: string;
        statusCode: number;
        userAgent: string;
        timestamp: Date;
    }>;

    // Metadata
    aggregationType: "hourly" | "daily";
    processedAt: Date;
    rawLogCount: number; // Number of raw logs processed to create this stat
}
