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
            statusMessage: "Invalid authentication",
        });
    }

    // Check if user is admin (assuming admin property exists)
    if (!user.administrator) {
        throw createError({
            statusCode: 403,
            statusMessage: "Forbidden: Admin access required",
        });
    }

    const query = getQuery(event);
    const page = parseInt(String(query.page || "1"), 10);
    const limit = Math.min(parseInt(String(query.limit || "50"), 10), 250);
    const skip = (page - 1) * limit;

    // Build filter conditions
    const filterConditions: any = {};

    // Filter by data type
    if (query.dataType && query.dataType !== "all") {
        filterConditions.dataType = query.dataType;
    }

    // Filter by source
    if (query.source && query.source !== "all") {
        filterConditions.source = query.source;
    }

    // Filter by status
    if (query.status && query.status !== "all") {
        if (query.status === "success") {
            filterConditions.error = false;
        } else if (query.status === "error") {
            filterConditions.error = true;
        }
    }

    // Filter by character ID if provided
    if (query.characterId) {
        filterConditions.characterId = parseInt(String(query.characterId), 10);
    }

    // Date range filter (last 30 days by default)
    const endDate = query.endDate
        ? new Date(String(query.endDate))
        : new Date();
    const startDate = query.startDate
        ? new Date(String(query.startDate))
        : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    filterConditions.timestamp = {
        $gte: startDate,
        $lte: endDate,
    };

    // Get total count for pagination
    const total = await ESILogs.countDocuments(filterConditions);
    const pages = Math.ceil(total / limit);

    // Fetch logs with filters, sorting, and pagination
    const logs = await ESILogs.find(filterConditions)
        .sort({ timestamp: -1 })
        .skip(skip)
        .limit(limit)
        .lean();

    // Get unique character IDs from the logs to fetch character data
    const characterIds = [
        ...new Set(logs.map((log) => log.characterId).filter(Boolean)),
    ];

    // Fetch character data for the logs
    const characters = await Characters.find(
        { character_id: { $in: characterIds } },
        { character_id: 1, name: 1, corporation_id: 1, alliance_id: 1 }
    ).lean();

    // Create a character lookup map
    const characterMap = new Map(
        characters.map((char) => [char.character_id, char])
    );

    // Manually populate character data in logs
    const populatedLogs = logs.map((log) => {
        const characterData = characterMap.get(log.characterId);
        return {
            ...log,
            characterId: characterData || null,
        };
    });

    // Get available filter options for dropdowns
    const [dataTypes, sources] = await Promise.all([
        ESILogs.distinct("dataType", {
            timestamp: { $gte: startDate, $lte: endDate },
        }),
        ESILogs.distinct("source", {
            timestamp: { $gte: startDate, $lte: endDate },
        }),
    ]);

    // Calculate summary statistics
    const summaryStats = await ESILogs.aggregate([
        {
            $match: {
                timestamp: { $gte: startDate, $lte: endDate },
            },
        },
        {
            $group: {
                _id: null,
                totalRequests: { $sum: 1 },
                successfulRequests: {
                    $sum: { $cond: [{ $eq: ["$error", false] }, 1, 0] },
                },
                errorRequests: {
                    $sum: { $cond: [{ $eq: ["$error", true] }, 1, 0] },
                },
                uniqueCharacters: { $addToSet: "$characterId" },
                totalItemsFetched: {
                    $sum: {
                        $cond: [
                            { $isArray: "$fetchedData" },
                            { $size: "$fetchedData" },
                            0,
                        ],
                    },
                },
                totalNewItems: {
                    $sum: {
                        $cond: [
                            { $and: [
                                { $ne: ["$newItemsCount", null] },
                                { $ne: ["$newItemsCount", undefined] }
                            ]},
                            "$newItemsCount",
                            0,
                        ],
                    },
                },
            },
        },
        {
            $project: {
                _id: 0,
                totalRequests: 1,
                successfulRequests: 1,
                errorRequests: 1,
                uniqueCharacters: { $size: "$uniqueCharacters" },
                totalItemsFetched: 1,
                totalNewItems: 1,
                successRate: {
                    $multiply: [
                        { $divide: ["$successfulRequests", "$totalRequests"] },
                        100,
                    ],
                },
                newItemsRate: {
                    $cond: [
                        { $eq: ["$totalItemsFetched", 0] },
                        0,
                        {
                            $multiply: [
                                { $divide: ["$totalNewItems", "$totalItemsFetched"] },
                                100,
                            ],
                        },
                    ],
                },
            },
        },
    ]);

    // Get most active data types
    const topDataTypes = await ESILogs.aggregate([
        {
            $match: {
                timestamp: { $gte: startDate, $lte: endDate },
            },
        },
        {
            $group: {
                _id: "$dataType",
                count: { $sum: 1 },
                successCount: {
                    $sum: { $cond: [{ $eq: ["$error", false] }, 1, 0] },
                },
                errorCount: {
                    $sum: { $cond: [{ $eq: ["$error", true] }, 1, 0] },
                },
            },
        },
        {
            $project: {
                dataType: "$_id",
                count: 1,
                successCount: 1,
                errorCount: 1,
                successRate: {
                    $multiply: [{ $divide: ["$successCount", "$count"] }, 100],
                },
            },
        },
        { $sort: { count: -1 } },
        { $limit: 10 },
    ]);

    return {
        success: true,
        data: {
            logs: populatedLogs,
            pagination: {
                total,
                pages,
                page,
                limit,
            },
            filters: {
                dataTypes: dataTypes.sort(),
                sources: sources.sort(),
            },
            summary: summaryStats[0] || {
                totalRequests: 0,
                successfulRequests: 0,
                errorRequests: 0,
                uniqueCharacters: 0,
                totalItemsFetched: 0,
                totalNewItems: 0,
                successRate: 0,
                newItemsRate: 0,
            },
            topDataTypes,
            dateRange: {
                startDate: startDate.toISOString(),
                endDate: endDate.toISOString(),
            },
        },
    };
});
