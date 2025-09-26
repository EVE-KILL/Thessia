import prisma from "../../lib/prisma";

export class AccessLogService {
    /**
     * Create a new access log entry
     */
    static async create(logData: {
        timestamp: Date;
        method: string;
        url: string;
        httpVersion: string;
        userAgent: string;
        clientIp: string;
        statusCode?: number;
        responseTime?: number;
        responseSize?: number;
        referrer?: string;
        userId?: number;
        endpoint?: string;
        isBot?: boolean;
        isApiRequest?: boolean;
        logType?: string;
        sessionId?: string;
    }) {
        return await prisma.accessLog.create({
            data: logData,
        });
    }

    /**
     * Create multiple access log entries at once
     */
    static async createMany(
        logEntries: Array<{
            timestamp: Date;
            method: string;
            url: string;
            httpVersion: string;
            userAgent: string;
            clientIp: string;
            statusCode?: number;
            responseTime?: number;
            responseSize?: number;
            referrer?: string;
            userId?: number;
            endpoint?: string;
            isBot?: boolean;
            isApiRequest?: boolean;
            logType?: string;
            sessionId?: string;
        }>
    ) {
        return await prisma.accessLog.createMany({
            data: logEntries,
        });
    }

    /**
     * Find access logs by date range
     */
    static async findByDateRange(
        startDate: Date,
        endDate: Date,
        limit?: number
    ) {
        return await prisma.accessLog.findMany({
            where: {
                timestamp: {
                    gte: startDate,
                    lte: endDate,
                },
            },
            take: limit,
            orderBy: { timestamp: "desc" },
        });
    }

    /**
     * Find access logs by user ID
     */
    static async findByUserId(userId: number, limit?: number) {
        return await prisma.accessLog.findMany({
            where: { userId },
            take: limit,
            orderBy: { timestamp: "desc" },
        });
    }

    /**
     * Find access logs by client IP
     */
    static async findByClientIp(clientIp: string, limit?: number) {
        return await prisma.accessLog.findMany({
            where: { clientIp },
            take: limit,
            orderBy: { timestamp: "desc" },
        });
    }

    /**
     * Find access logs by endpoint
     */
    static async findByEndpoint(endpoint: string, limit?: number) {
        return await prisma.accessLog.findMany({
            where: { endpoint },
            take: limit,
            orderBy: { timestamp: "desc" },
        });
    }

    /**
     * Find access logs by status code
     */
    static async findByStatusCode(statusCode: number, limit?: number) {
        return await prisma.accessLog.findMany({
            where: { statusCode },
            take: limit,
            orderBy: { timestamp: "desc" },
        });
    }

    /**
     * Find API requests only
     */
    static async findApiRequests(limit?: number) {
        return await prisma.accessLog.findMany({
            where: { isApiRequest: true },
            take: limit,
            orderBy: { timestamp: "desc" },
        });
    }

    /**
     * Find bot requests only
     */
    static async findBotRequests(limit?: number) {
        return await prisma.accessLog.findMany({
            where: { isBot: true },
            take: limit,
            orderBy: { timestamp: "desc" },
        });
    }

    /**
     * Get access log statistics for a date range
     */
    static async getStatsByDateRange(startDate: Date, endDate: Date) {
        const logs = await prisma.accessLog.findMany({
            where: {
                timestamp: {
                    gte: startDate,
                    lte: endDate,
                },
            },
            select: {
                statusCode: true,
                method: true,
                isBot: true,
                isApiRequest: true,
                responseTime: true,
                responseSize: true,
            },
        });

        // Calculate statistics
        const totalRequests = logs.length;
        const botRequests = logs.filter((log) => log.isBot).length;
        const apiRequests = logs.filter((log) => log.isApiRequest).length;
        const errorRequests = logs.filter(
            (log) => log.statusCode && log.statusCode >= 400
        ).length;

        const avgResponseTime =
            logs.length > 0
                ? logs.reduce((sum, log) => sum + (log.responseTime || 0), 0) /
                  logs.length
                : 0;

        const avgResponseSize =
            logs.length > 0
                ? logs.reduce((sum, log) => sum + (log.responseSize || 0), 0) /
                  logs.length
                : 0;

        // Status code distribution
        const statusCodes: Record<number, number> = {};
        logs.forEach((log) => {
            if (log.statusCode) {
                statusCodes[log.statusCode] =
                    (statusCodes[log.statusCode] || 0) + 1;
            }
        });

        // Method distribution
        const methods: Record<string, number> = {};
        logs.forEach((log) => {
            methods[log.method] = (methods[log.method] || 0) + 1;
        });

        return {
            totalRequests,
            botRequests,
            apiRequests,
            errorRequests,
            avgResponseTime: Math.round(avgResponseTime * 100) / 100,
            avgResponseSize: Math.round(avgResponseSize),
            statusCodes,
            methods,
        };
    }

    /**
     * Get most active IPs for a date range
     */
    static async getMostActiveIPs(
        startDate: Date,
        endDate: Date,
        limit: number = 10
    ) {
        const result = await prisma.accessLog.groupBy({
            by: ["clientIp"],
            where: {
                timestamp: {
                    gte: startDate,
                    lte: endDate,
                },
            },
            _count: {
                clientIp: true,
            },
            orderBy: {
                _count: {
                    clientIp: "desc",
                },
            },
            take: limit,
        });

        return result.map((item) => ({
            clientIp: item.clientIp,
            requestCount: item._count.clientIp,
        }));
    }

    /**
     * Get most accessed endpoints for a date range
     */
    static async getMostAccessedEndpoints(
        startDate: Date,
        endDate: Date,
        limit: number = 10
    ) {
        const result = await prisma.accessLog.groupBy({
            by: ["endpoint"],
            where: {
                timestamp: {
                    gte: startDate,
                    lte: endDate,
                },
                endpoint: {
                    not: null,
                },
            },
            _count: {
                endpoint: true,
            },
            orderBy: {
                _count: {
                    endpoint: "desc",
                },
            },
            take: limit,
        });

        return result.map((item) => ({
            endpoint: item.endpoint,
            requestCount: item._count.endpoint,
        }));
    }

    /**
     * Delete old access logs (older than specified date)
     */
    static async deleteOldLogs(olderThan: Date) {
        return await prisma.accessLog.deleteMany({
            where: {
                timestamp: {
                    lt: olderThan,
                },
            },
        });
    }

    /**
     * Count total access logs
     */
    static async count(): Promise<number> {
        return await prisma.accessLog.count();
    }

    /**
     * Count access logs by date range
     */
    static async countByDateRange(
        startDate: Date,
        endDate: Date
    ): Promise<number> {
        return await prisma.accessLog.count({
            where: {
                timestamp: {
                    gte: startDate,
                    lte: endDate,
                },
            },
        });
    }
}
