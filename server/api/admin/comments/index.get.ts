export default defineEventHandler(async (event) => {
    // Add cache-control headers to prevent caching
    setResponseHeaders(event, {
        "Cache-Control": "no-cache, no-store, must-revalidate",
        Pragma: "no-cache",
        Expires: "0",
    });

    // Get the cookie value using the hardcoded cookie name
    const cookieName = "evelogin";
    const cookie = getCookie(event, cookieName);

    if (!cookie) {
        throw createError({
            statusCode: 401,
            statusMessage: "Authentication required",
        });
    }

    // Find the user by uniqueIdentifier
    const user = await Users.findOne({ uniqueIdentifier: cookie });

    if (!user) {
        throw createError({
            statusCode: 401,
            statusMessage: "Invalid authentication",
        });
    }

    // Only allow administrators
    if (!user.administrator) {
        throw createError({
            statusCode: 403,
            statusMessage: "Access denied. Administrator privileges required.",
        });
    }

    try {
        const query = getQuery(event);
        const page = parseInt(query.page as string) || 1;
        const limit = parseInt(query.limit as string) || 25;
        const search = (query.search as string) || "";
        const sortBy = (query.sortBy as string) || "createdAt";
        const sortOrder = (query.sortOrder as string) || "desc";
        const showDeleted =
            query.showDeleted === "true" || query.showDeleted === true;

        // Entity filtering parameters
        const characterId = query.characterId
            ? parseInt(query.characterId as string)
            : null;
        const corporationId = query.corporationId
            ? parseInt(query.corporationId as string)
            : null;
        const allianceId = query.allianceId
            ? parseInt(query.allianceId as string)
            : null;

        // Build MongoDB filter
        const filter: any = {};

        // Filter by deletion status
        if (showDeleted) {
            // Show all comments (both active and soft-deleted)
            // No additional filter needed
        } else {
            // Only show active comments (not soft-deleted)
            filter.deleted_at = { $exists: false };
        }

        // Search filter
        if (search) {
            filter.$or = [
                { comment: { $regex: search, $options: "i" } },
                { characterName: { $regex: search, $options: "i" } },
            ];
        }

        // Entity filters
        if (characterId) {
            filter.characterId = characterId;
        }
        if (corporationId) {
            filter.corporationId = corporationId;
        }
        if (allianceId) {
            filter.allianceId = allianceId;
        }

        // Calculate pagination
        const skip = (page - 1) * limit;

        // Build sort object
        const sort: any = {};
        sort[sortBy] = sortOrder === "desc" ? -1 : 1;

        // Get comments with pagination
        const [comments, totalCount] = await Promise.all([
            Comments.find(filter).sort(sort).skip(skip).limit(limit).lean(),
            Comments.countDocuments(filter),
        ]);

        // Get statistics
        const [stats] = await Promise.all([
            Comments.aggregate([
                {
                    $group: {
                        _id: null,
                        total: { $sum: 1 },
                        today: {
                            $sum: {
                                $cond: [
                                    {
                                        $gte: [
                                            "$createdAt",
                                            new Date(
                                                new Date().setHours(0, 0, 0, 0)
                                            ),
                                        ],
                                    },
                                    1,
                                    0,
                                ],
                            },
                        },
                        thisWeek: {
                            $sum: {
                                $cond: [
                                    {
                                        $gte: [
                                            "$createdAt",
                                            new Date(
                                                Date.now() -
                                                    7 * 24 * 60 * 60 * 1000
                                            ),
                                        ],
                                    },
                                    1,
                                    0,
                                ],
                            },
                        },
                        thisMonth: {
                            $sum: {
                                $cond: [
                                    {
                                        $gte: [
                                            "$createdAt",
                                            new Date(
                                                new Date().getFullYear(),
                                                new Date().getMonth(),
                                                1
                                            ),
                                        ],
                                    },
                                    1,
                                    0,
                                ],
                            },
                        },
                    },
                },
            ]),
        ]);

        const commentStats = stats[0] || {
            total: 0,
            today: 0,
            thisWeek: 0,
            thisMonth: 0,
        };

        // Calculate pagination info
        const totalPages = Math.ceil(totalCount / limit);
        const hasNextPage = page < totalPages;
        const hasPrevPage = page > 1;

        return {
            success: true,
            comments: comments,
            stats: commentStats,
            pagination: {
                currentPage: page,
                totalPages,
                hasNextPage,
                hasPrevPage,
                total: totalCount,
            },
        };
    } catch (error) {
        console.error("Error fetching admin comments:", error);
        throw createError({
            statusCode: 500,
            statusMessage: "Failed to fetch comments",
        });
    }
});
