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
            // Send initial batch of recent logs (last 50)
            const recentLogs = await AccessLogs.find()
                .sort({ _id: -1 }) // Sort by _id descending (newest first)
                .limit(50)
                .lean();

            if (recentLogs.length > 0) {
                // Send logs in chronological order (oldest first)
                const chronologicalLogs = recentLogs.reverse();

                for (const log of chronologicalLogs) {
                    const logLine = formatAccessLogEntry(log);
                    await eventStream.push(`${logLine}\n\n`);
                }

                // Update last _id to the most recent log (last in chronological array)
                lastObjectId =
                    chronologicalLogs[chronologicalLogs.length - 1]._id;
            }

            // Set up interval to check for new logs
            intervalId = setInterval(async () => {
                try {
                    const mongoFilter = buildMongoFilter();

                    const newLogs = await AccessLogs.find(mongoFilter)
                        .sort({ _id: 1 }) // Ascending order by _id for new logs
                        .limit(100) // Limit to prevent overwhelming
                        .lean();

                    if (newLogs.length > 0) {
                        for (const log of newLogs) {
                            const logLine = formatAccessLogEntry(log);
                            await eventStream.push(`${logLine}\n\n`);
                        }

                        // Update last _id to the newest log processed
                        lastObjectId = newLogs[newLogs.length - 1]._id;
                    }
                } catch (error) {
                    console.error(
                        "SSE: Error fetching new access logs:",
                        error
                    );
                }
            }, 1000); // Check every second
        } catch (error) {
            console.error("SSE: Error setting up access log streaming:", error);
            await eventStream.push(
                `data: ${JSON.stringify({
                    type: "error",
                    message: `Failed to set up access log streaming: ${
                        error instanceof Error ? error.message : "Unknown error"
                    }`,
                })}\n\n`
            );
        }
    };

    // Handle cleanup on close
    eventStream.onClosed(async () => {
        if (intervalId) {
            clearInterval(intervalId);
            intervalId = null;
        }
        await eventStream.close();
    });

    // Start the access log streaming setup
    setupAccessLogStreaming();

    return eventStream.send();
});
