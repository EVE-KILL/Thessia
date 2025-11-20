import prisma from "~/lib/prisma";

export default defineEventHandler(async (event) => {
    // Get authentication cookie
    const cookieName = "evelogin";
    const cookie = getCookie(event, cookieName);

    if (!cookie) {
        throw createError({
            statusCode: 401,
            statusMessage: "Authentication required",
        });
    }

    // Find user by cookie value
    const user = await prisma.user.findUnique({ where: { uniqueIdentifier: cookie } });

    if (!user) {
        throw createError({
            statusCode: 401,
            statusMessage: "Invalid session",
        });
    }

    // Check if user is administrator
    if (user.role !== "admin") {
        throw createError({
            statusCode: 403,
            statusMessage: "Administrator access required",
        });
    }

    const query = getQuery(event);

    // Create the event stream
    const eventStream = createEventStream(event);

    // Set up variables for cleanup
    let intervalId: ReturnType<typeof setInterval> | null = null;
    let lastLogId: number | null = null;
    let isStreamClosed = false;

    // Extract filters from query parameters
    const filters: any = {};
    if (query.search) filters.search = String(query.search);
    if (query.method) filters.method = String(query.method);
    if (query.statusCode) filters.statusCode = String(query.statusCode);
    if (query.isBot) filters.isBot = String(query.isBot);
    if (query.apiFilter) filters.apiFilter = String(query.apiFilter);
    if (query.hideUnderscoreUrls)
        filters.hideUnderscoreUrls = String(query.hideUnderscoreUrls);
    if (query.logType) filters.logType = String(query.logType);

    // Function to build Prisma filter based on filters
    const buildPrismaFilter = () => {
        const prismaFilter: any = {};

        // Apply id filter for new logs (greater than last seen id)
        if (lastLogId) {
            prismaFilter.id = { gt: lastLogId };
        }

        // Apply search filter
        if (filters.search) {
            prismaFilter.OR = [
                { url: { contains: filters.search, mode: "insensitive" } },
                { endpoint: { contains: filters.search, mode: "insensitive" } },
                { clientIp: { contains: filters.search, mode: "insensitive" } },
                { userAgent: { contains: filters.search, mode: "insensitive" } },
            ];
        }

        // Apply method filter
        if (filters.method) {
            prismaFilter.method = filters.method;
        }

        // Apply status code filter
        if (filters.statusCode) {
            if (filters.statusCode.includes("x")) {
                // Handle status code ranges like 2xx, 4xx
                const statusPrefix = filters.statusCode.replace("x", "");
                prismaFilter.statusCode = {
                    gte: parseInt(statusPrefix + "00"),
                    lt: parseInt(statusPrefix + "99") + 1,
                };
            } else {
                prismaFilter.statusCode = parseInt(filters.statusCode);
            }
        }

        // Apply bot filter
        if (filters.isBot) {
            prismaFilter.isBot = filters.isBot === "true";
        }

        // Apply API filter
        if (filters.apiFilter) {
            if (filters.apiFilter === "only") {
                prismaFilter.isApiRequest = true;
            } else if (filters.apiFilter === "exclude") {
                prismaFilter.isApiRequest = { not: true };
            }
            // 'include' means no filter on isApiRequest
        }

        // Apply underscore URL filter
        if (filters.hideUnderscoreUrls === "true") {
            prismaFilter.url = { not: { startsWith: "/_" } };
        }

        // Apply log type filter
        if (filters.logType) {
            prismaFilter.logType = filters.logType;
        }

        return prismaFilter;
    };

    // Function to format access log entry as nginx-style string
    const formatAccessLogEntry = (log: any) => {
        const timestamp = new Date(log.timestamp).toISOString();
        const method = log.method || "UNKNOWN";
        const url = log.url || "/";
        const statusCode = log.statusCode || 0;
        const responseTime = log.responseTime || 0;
        const clientIp = log.clientIp || "0.0.0.0";
        const userAgent = log.userAgent || "-";
        const logType = log.logType ? `[${log.logType.toUpperCase()}]` : "";
        const botIndicator = log.isBot ? "[BOT]" : "";
        const apiIndicator = log.isApiRequest ? "[API]" : "";

        // Create log format with flags first (similar to AdminLogs)
        const flags = `${logType}${botIndicator}${apiIndicator}`.trim();
        const flagsPrefix = flags ? `${flags} ` : "";

        return `${flagsPrefix}${timestamp} ${clientIp} "${method} ${url}" ${statusCode} ${responseTime}ms "${userAgent}"`;
    };

    // Start the access log streaming
    const setupAccessLogStreaming = async () => {
        try {
            // Check if stream is already closed
            if (isStreamClosed) return;

            // Send initial batch of recent logs (last 50) with timeout
            const recentLogs = await prisma.accessLog.findMany({
                orderBy: { id: 'desc' },
                take: 50,
            });

            if (recentLogs.length > 0 && !isStreamClosed) {
                // Send logs in chronological order (oldest first)
                const chronologicalLogs = recentLogs.reverse();

                for (const log of chronologicalLogs) {
                    // Check if stream is closed before each push
                    if (isStreamClosed) break;

                    try {
                        const logLine = formatAccessLogEntry(log);
                        await eventStream.push(`${logLine}\n\n`);
                    } catch (pushError) {
                        isStreamClosed = true;
                        break;
                    }
                }

                // Update last id to the most recent log (last in chronological array)
                if (!isStreamClosed) {
                    lastLogId = chronologicalLogs[chronologicalLogs.length - 1].id;
                }
            }

            // Set up interval to check for new logs
            intervalId = setInterval(async () => {
                // Check if stream is closed to prevent unnecessary work
                if (isStreamClosed) {
                    if (intervalId) {
                        clearInterval(intervalId);
                        intervalId = null;
                    }
                    return;
                }

                try {
                    const prismaFilter = buildPrismaFilter();

                    const newLogs = await prisma.accessLog.findMany({
                        where: prismaFilter,
                        orderBy: { id: 'asc' },
                        take: 100,
                    });

                    if (newLogs.length > 0 && !isStreamClosed) {
                        for (const log of newLogs) {
                            // Check if stream is still open before pushing
                            if (isStreamClosed) break;

                            try {
                                const logLine = formatAccessLogEntry(log);
                                await eventStream.push(`${logLine}\n\n`);
                            } catch (pushError) {
                                isStreamClosed = true;
                                break;
                            }
                        }

                        // Update last id to the newest log processed
                        if (!isStreamClosed) {
                            lastLogId = newLogs[newLogs.length - 1].id;
                        }
                    }
                } catch (error) {
                    if (!isStreamClosed) {
                        console.error(
                            "SSE: Error fetching new access logs:",
                            error
                        );

                        // If it's a serious database error, close the stream
                        if (
                            error instanceof Error &&
                            (error.message.includes("timeout") ||
                                error.message.includes("connection") ||
                                error.message.includes("disconnected"))
                        ) {
                            isStreamClosed = true;
                            try {
                                await eventStream.push(
                                    `data: ${JSON.stringify({
                                        type: "error",
                                        message:
                                            "Database connection error, please refresh",
                                    })}\n\n`
                                );
                            } catch (pushError) {
                                // Ignore push errors when connection is closed
                            }
                        }
                    }
                }
            }, 1000); // Check every second
        } catch (error) {
            console.error("SSE: Error setting up access log streaming:", error);
            isStreamClosed = true;

            try {
                await eventStream.push(
                    `data: ${JSON.stringify({
                        type: "error",
                        message: `Failed to set up access log streaming: ${
                            error instanceof Error
                                ? error.message
                                : "Unknown error"
                        }`,
                    })}\n\n`
                );
            } catch (pushError) {
                console.log(
                    "SSE: Failed to send error message, connection likely closed"
                );
            }
        }
    };

    // Handle cleanup on close
    eventStream.onClosed(async () => {
        isStreamClosed = true;

        if (intervalId) {
            clearInterval(intervalId);
            intervalId = null;
        }

        try {
            await eventStream.close();
        } catch (error) {
            // Ignore cleanup errors
        }
    });

    // Start the access log streaming setup with error handling
    setupAccessLogStreaming().catch((error) => {
        console.error("SSE: Fatal error in setupAccessLogStreaming:", error);
        isStreamClosed = true;

        // Try to send error to client
        eventStream
            .push(
                `data: ${JSON.stringify({
                    type: "error",
                    message: `Fatal streaming error: ${
                        error instanceof Error ? error.message : "Unknown error"
                    }`,
                })}\n\n`
            )
            .catch(() => {
                // Ignore if we can't send the error
            });
    });

    return eventStream.send();
});
