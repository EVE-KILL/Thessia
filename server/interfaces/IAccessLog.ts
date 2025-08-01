export interface IAccessLog {
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
    endpoint?: string; // Normalized endpoint pattern (e.g., /api/killmail/:id)
    isBot?: boolean;
    isApiRequest?: boolean;
    logType?: "server" | "client"; // Distinguish between server requests and client-side navigation
    sessionId?: string; // For correlating client-side events
}
