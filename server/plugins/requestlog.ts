import chalk from "chalk";
import { isbot } from "isbot";
import { nitroApp } from "nitropack/runtime/internal/app";

// Access log buffer configuration
const ACCESS_LOG_CONFIG = {
    bufferMaxSize: 1000,
    flushInterval: 5000, // 5 seconds
    enableDatabaseLogging: true,
};

// In-memory buffer for access logs
let accessLogBuffer: IAccessLog[] = [];
let flushTimer: NodeJS.Timeout | null = null;
let isFlushInProgress = false;

/**
 * Bot detection using the isbot library
 * Much more comprehensive than regex patterns
 */
function detectBot(userAgent: string): boolean {
    if (!userAgent) return false;
    return isbot(userAgent);
}

/**
 * Add access log entry to buffer
 */
function addToBuffer(logEntry: IAccessLog): void {
    if (!ACCESS_LOG_CONFIG.enableDatabaseLogging) return;

    accessLogBuffer.push(logEntry);

    // Trigger flush if buffer is full
    if (accessLogBuffer.length >= ACCESS_LOG_CONFIG.bufferMaxSize) {
        scheduleFlush();
    }
}

/**
 * Schedule buffer flush (debounced)
 */
function scheduleFlush(): void {
    if (flushTimer) {
        clearTimeout(flushTimer);
    }

    flushTimer = setTimeout(flushBuffer, 100); // Small delay to batch rapid requests
}

/**
 * Flush buffer to database
 */
async function flushBuffer(): Promise<void> {
    if (isFlushInProgress || accessLogBuffer.length === 0) return;

    isFlushInProgress = true;

    try {
        // Move current buffer to processing array and clear buffer immediately
        const logsToProcess = [...accessLogBuffer];
        accessLogBuffer.length = 0;

        if (logsToProcess.length === 0) return;

        // Import the model dynamically to avoid import issues
        const { AccessLogs } = await import("../models/AccessLogs");

        // Bulk insert with unordered writes for better performance
        await AccessLogs.insertMany(logsToProcess, {
            ordered: false,
            lean: true,
        });

        cliLogger.debug(
            `📝 Flushed ${logsToProcess.length} access log entries to database`
        );
    } catch (error) {
        cliLogger.error(`❌ Error flushing access logs to database: ${error}`);

        // In case of error, we could optionally put logs back in buffer
        // but for access logs, it's probably better to just log and continue
    } finally {
        isFlushInProgress = false;
        flushTimer = null;
    }
}

/**
 * Setup periodic flush timer
 */
function setupPeriodicFlush(): void {
    setInterval(flushBuffer, ACCESS_LOG_CONFIG.flushInterval);
}

/**
 * Graceful shutdown handler
 */
function setupShutdownHandler(): void {
    const shutdown = async () => {
        cliLogger.info("📝 Flushing remaining access logs before shutdown...");
        await flushBuffer();
        process.exit(0);
    };

    process.on("SIGTERM", shutdown);
    process.on("SIGINT", shutdown);
}

export default defineNitroPlugin(() => {
    // Setup periodic flush and shutdown handlers
    setupPeriodicFlush();
    setupShutdownHandler();

    // Hook into request lifecycle
    nitroApp.hooks.hook("request", (event) => {
        const requestStartTime = Date.now();
        const requestIp = getRequestIP(event, { xForwardedFor: true });
        const userAgent = event.node.req.headers["user-agent"] || "";
        const method = event.node.req.method || "GET";
        const url = event.node.req.url || "";
        const httpVersion = event.node.req.httpVersion || "1.1";
        const referrer =
            event.node.req.headers.referer ||
            event.node.req.headers.referrer ||
            "";

        // Store request start time for response time calculation
        event.context.requestStartTime = requestStartTime;

        // Output request log info similar to nginx but with colors (keep existing behavior)
        cliLogger.info(
            `${chalk.cyan(method)} ${chalk.white(url)} ${chalk.gray(
                `HTTP/${httpVersion}`
            )} ${chalk.yellow(userAgent)} ${chalk.magenta(`[${requestIp}]`)}`
        );

        // Prepare access log entry (will be completed in response hook)
        event.context.accessLogEntry = {
            timestamp: new Date(requestStartTime),
            method,
            url,
            httpVersion,
            userAgent,
            clientIp: requestIp,
            referrer: referrer || undefined,
            isBot: detectBot(userAgent),
            isApiRequest: url.startsWith("/api"),
        } as IAccessLog;
    });

    // Hook into response to capture response data
    nitroApp.hooks.hook("beforeResponse", (event, { body }) => {
        if (!event.context.accessLogEntry || !event.context.requestStartTime)
            return;

        const responseTime = Date.now() - event.context.requestStartTime;
        const statusCode = event.node.res.statusCode;

        // Calculate response size
        let responseSize: number | undefined;
        if (body) {
            if (typeof body === "string") {
                responseSize = Buffer.byteLength(body, "utf8");
            } else if (Buffer.isBuffer(body)) {
                responseSize = body.length;
            } else if (typeof body === "object") {
                responseSize = Buffer.byteLength(JSON.stringify(body), "utf8");
            }
        }

        // Complete the access log entry
        const logEntry: IAccessLog = {
            ...event.context.accessLogEntry,
            statusCode,
            responseTime,
            responseSize,
        };

        // Add to buffer for database insertion
        addToBuffer(logEntry);
    });
});
