export default defineEventHandler(async (event) => {
    // Add cache-control headers to prevent caching
    setResponseHeaders(event, {
        "Cache-Control": "no-cache, no-store, must-revalidate",
        Pragma: "no-cache",
        Expires: "0",
    });

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

    try {
        const query = getQuery(event);

        // Parse pagination parameters
        const page = Math.max(1, parseInt(query.page as string) || 1);
        const limit = Math.min(
            100,
            Math.max(10, parseInt(query.limit as string) || 50)
        );
        const skip = (page - 1) * limit;

        // Parse filter parameters
        const search = query.search as string;
        const method = query.method as string;
        const statusCode = query.statusCode as string;
        const isBot = query.isBot as string;
        const apiFilter = query.apiFilter as string; // 'exclude', 'include', 'only'
        const hideUnderscoreUrls = query.hideUnderscoreUrls as string; // 'true' to hide URLs starting with _
        const logType = query.logType as string; // 'server', 'client'
        const since = query.since as string; // For incremental updates

        // Build MongoDB filter
        const filter: any = {};

        // If 'since' is provided, only get entries newer than this timestamp
        if (since) {
            filter.timestamp = { $gt: new Date(since) };
        }

        if (search) {
            filter.$or = [
                { url: { $regex: search, $options: "i" } },
                { clientIp: { $regex: search, $options: "i" } },
                { userAgent: { $regex: search, $options: "i" } },
                { endpoint: { $regex: search, $options: "i" } },
            ];
        }

        if (method) {
            filter.method = method;
        }

        if (statusCode) {
            filter.statusCode = parseInt(statusCode);
        }

        if (isBot === "true") {
            filter.isBot = true;
        } else if (isBot === "false") {
            filter.isBot = false;
        }

        // Handle API filter
        if (apiFilter === "exclude") {
            filter.isApiRequest = false; // Exclude API requests
        } else if (apiFilter === "only") {
            filter.isApiRequest = true; // Only API requests
        }
        // If apiFilter === 'include' or not specified, don't add filter (show all)

        // Handle underscore URL filter
        if (hideUnderscoreUrls === "true") {
            filter.url = { $not: { $regex: "^/_" } }; // Exclude URLs starting with /_
        }

        // Handle log type filter
        if (logType === "server" || logType === "client") {
            filter.logType = logType;
        }

        // Get total count for pagination (only if not fetching incremental updates)
        const total = since ? 0 : await AccessLogs.countDocuments(filter);

        // Fetch access logs with pagination, sorted by most recent first
        const logs = await AccessLogs.find(filter)
            .sort({ timestamp: -1 })
            .skip(since ? 0 : skip) // Don't skip for incremental updates
            .limit(limit)
            .lean();

        // Calculate pagination info
        const totalPages = since ? 0 : Math.ceil(total / limit);
        const hasNextPage = since ? false : page < totalPages;
        const hasPrevPage = since ? false : page > 1;

        return {
            success: true,
            data: logs,
            pagination: {
                page,
                limit,
                total,
                totalPages,
                hasNextPage,
                hasPrevPage,
            },
        };
    } catch (error) {
        console.error("Error fetching access logs:", error);
        throw createError({
            statusCode: 500,
            statusMessage: "Failed to fetch access logs",
        });
    }
});
