export default defineEventHandler(async (event) => {
    // Authenticate and verify admin privileges
    await requireAdminAuth(event);

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

    // Date range filter (last 7 days by default, max 30 days to prevent heavy queries)
    const endDate = query.endDate
        ? new Date(String(query.endDate))
        : new Date();
    const requestedStartDate = query.startDate
        ? new Date(String(query.startDate))
        : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000); // Default to 7 days

    // Enforce maximum range of 30 days to prevent performance issues
    const maxDaysBack = 30;
    const earliestAllowedDate = new Date(
        endDate.getTime() - maxDaysBack * 24 * 60 * 60 * 1000
    );
    const startDate =
        requestedStartDate < earliestAllowedDate
            ? earliestAllowedDate
            : requestedStartDate;

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

    // Calculate summary statistics with optimized aggregation
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
                    $sum: { $cond: [{ $not: ["$error"] }, 1, 0] },
                },
                errorRequests: {
                    $sum: { $cond: ["$error", 1, 0] },
                },
                uniqueCharacters: { $addToSet: "$characterId" },
                totalItemsFetched: {
                    $sum: { $ifNull: ["$itemsReturned", 0] },
                },
                totalNewItems: {
                    $sum: { $ifNull: ["$newItemsCount", 0] },
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
                    $cond: [
                        { $eq: ["$totalRequests", 0] },
                        0,
                        {
                            $multiply: [
                                {
                                    $divide: [
                                        "$successfulRequests",
                                        "$totalRequests",
                                    ],
                                },
                                100,
                            ],
                        },
                    ],
                },
                newItemsRate: {
                    $cond: [
                        { $eq: ["$totalItemsFetched", 0] },
                        0,
                        {
                            $multiply: [
                                {
                                    $divide: [
                                        "$totalNewItems",
                                        "$totalItemsFetched",
                                    ],
                                },
                                100,
                            ],
                        },
                    ],
                },
            },
        },
    ])
        .hint({ timestamp: -1 })
        .option({ maxTimeMS: 30000, allowDiskUse: false });

    // Get most active data types with optimized query
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
                    $sum: { $cond: [{ $not: ["$error"] }, 1, 0] },
                },
                errorCount: {
                    $sum: { $cond: ["$error", 1, 0] },
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
                    $cond: [
                        { $eq: ["$count", 0] },
                        0,
                        {
                            $multiply: [
                                { $divide: ["$successCount", "$count"] },
                                100,
                            ],
                        },
                    ],
                },
            },
        },
        { $sort: { count: -1 } },
        { $limit: 10 },
    ])
        .hint({ timestamp: -1 })
        .option({ maxTimeMS: 15000, allowDiskUse: false });

    // Get ESI user statistics
    const esiUserStats = await Users.aggregate([
        {
            $group: {
                _id: null,
                totalUsers: { $sum: 1 },
                activeUsers: {
                    $sum: { $cond: [{ $ne: ["$esiActive", false] }, 1, 0] },
                },
                deactivatedUsers: {
                    $sum: { $cond: [{ $eq: ["$esiActive", false] }, 1, 0] },
                },
            },
        },
    ]);

    const userStats = esiUserStats[0] || {
        totalUsers: 0,
        activeUsers: 0,
        deactivatedUsers: 0,
    };

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
            summary: {
                ...(summaryStats[0] || {
                    totalRequests: 0,
                    successfulRequests: 0,
                    errorRequests: 0,
                    uniqueCharacters: 0,
                    totalItemsFetched: 0,
                    totalNewItems: 0,
                    successRate: 0,
                    newItemsRate: 0,
                }),
                ...userStats,
            },
            topDataTypes,
            dateRange: {
                startDate: startDate.toISOString(),
                endDate: endDate.toISOString(),
            },
        },
    };
});
