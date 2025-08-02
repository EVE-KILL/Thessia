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
    const user = await Users.findOne({ uniqueIdentifier: cookie });

    if (!user) {
        throw createError({
            statusCode: 401,
            statusMessage: "Invalid session",
        });
    }

    // Check if user is administrator
    if (!user.administrator) {
        throw createError({
            statusCode: 403,
            statusMessage: "Administrator access required",
        });
    }

    const query = getQuery(event);

    // Create the event stream
    const eventStream = createEventStream(event);

    // Set up variables for cleanup
    let intervalId: NodeJS.Timeout | null = null;
    let lastObjectId: any = null;
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

    // Function to build MongoDB filter based on filters
    const buildMongoFilter = () => {
        const mongoFilter: any = {};

        // Apply _id filter for new logs (greater than last seen _id)
        if (lastObjectId) {
            mongoFilter._id = { $gt: lastObjectId };
        }

        // Apply search filter
        if (filters.search) {
            mongoFilter.$or = [
                { url: { $regex: filters.search, $options: "i" } },
                { endpoint: { $regex: filters.search, $options: "i" } },
                { clientIp: { $regex: filters.search, $options: "i" } },
                { userAgent: { $regex: filters.search, $options: "i" } },
            ];
        }

        // Apply method filter
        if (filters.method) {
            mongoFilter.method = filters.method;
        }

        // Apply status code filter
        if (filters.statusCode) {
            if (filters.statusCode.includes("x")) {
                // Handle status code ranges like 2xx, 4xx
                const statusPrefix = filters.statusCode.replace("x", "");
                mongoFilter.statusCode = {
                    $gte: parseInt(statusPrefix + "00"),
                    $lt: parseInt(statusPrefix + "99") + 1,
                };
            } else {
                mongoFilter.statusCode = parseInt(filters.statusCode);
            }
        }

        // Apply bot filter
        if (filters.isBot) {
            mongoFilter.isBot = filters.isBot === "true";
        }

        // Apply API filter
        if (filters.apiFilter) {
            if (filters.apiFilter === "only") {
                mongoFilter.isApiRequest = true;
            } else if (filters.apiFilter === "exclude") {
                mongoFilter.isApiRequest = { $ne: true };
            }
            // 'include' means no filter on isApiRequest
        }

        // Apply underscore URL filter
        if (filters.hideUnderscoreUrls === "true") {
            mongoFilter.url = { $not: { $regex: "^/_" } };
        }

        // Apply log type filter
        if (filters.logType) {
            mongoFilter.logType = filters.logType;
        }

        return mongoFilter;
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
            const recentLogs = await AccessLogs.find()
                .sort({ _id: -1 }) // Sort by _id descending (newest first)
                .limit(50)
                .maxTimeMS(10000) // 10 second timeout for initial load
                .lean()
                .exec();

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
                        // Connection closed
                        console.log(
                            "SSE: Connection closed during initial batch"
                        );
                        isStreamClosed = true;
                        break;
                    }
                }

                // Update last _id to the most recent log (last in chronological array)
                if (!isStreamClosed) {
                    lastObjectId =
                        chronologicalLogs[chronologicalLogs.length - 1]._id;
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
                    const mongoFilter = buildMongoFilter();

                    // Add timeout to MongoDB query to prevent hanging
                    const newLogs = await AccessLogs.find(mongoFilter)
                        .sort({ _id: 1 }) // Ascending order by _id for new logs
                        .limit(100) // Limit to prevent overwhelming
                        .maxTimeMS(5000) // 5 second timeout
                        .lean()
                        .exec();

                    if (newLogs.length > 0 && !isStreamClosed) {
                        for (const log of newLogs) {
                            // Check if stream is still open before pushing
                            if (isStreamClosed) break;

                            try {
                                const logLine = formatAccessLogEntry(log);
                                await eventStream.push(`${logLine}\n\n`);
                            } catch (pushError) {
                                // Connection closed, stop processing
                                console.log(
                                    "SSE: Connection closed, stopping log stream"
                                );
                                isStreamClosed = true;
                                break;
                            }
                        }

                        // Update last _id to the newest log processed
                        if (!isStreamClosed) {
                            lastObjectId = newLogs[newLogs.length - 1]._id;
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
                            console.log("SSE: Database error, closing stream");
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
                // Ignore push errors when connection is closed
                console.log(
                    "SSE: Failed to send error message, connection likely closed"
                );
            }
        }
    };

    // Handle cleanup on close
    eventStream.onClosed(async () => {
        console.log("SSE: Access log stream closed, cleaning up...");
        isStreamClosed = true;

        if (intervalId) {
            clearInterval(intervalId);
            intervalId = null;
        }

        try {
            await eventStream.close();
        } catch (error) {
            // Ignore cleanup errors
            console.log("SSE: Error during cleanup (expected):", error);
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
                console.log(
                    "SSE: Could not send fatal error to client, connection likely closed"
                );
            });
    });

    return eventStream.send();
});
