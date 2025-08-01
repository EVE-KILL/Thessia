export default defineEventHandler(async (event) => {
    try {
        const query = getQuery(event);
        const {
            q,
            page = 1,
            limit = 24,
            sortBy = "createdAt",
            sortOrder = "desc",
        } = query;

        if (!q || typeof q !== "string") {
            return createError({
                statusCode: 400,
                statusMessage: "Search query is required",
            });
        }

        // Parse pagination parameters
        const pageNum = parseInt(page as string, 10) || 1;
        const limitNum = parseInt(limit as string, 10) || 24;
        const skip = (pageNum - 1) * limitNum;

        // Build sort object
        const sortField =
            (sortBy as string) === "createdAt" ? "createdAt" : "createdAt";
        const sortDirection = (sortOrder as string) === "asc" ? 1 : -1;
        const sort = { [sortField]: sortDirection };

        // Build search query - use regex for partial matching
        const searchQuery = {
            deleted: { $ne: true }, // Exclude deleted comments
            $or: [
                // Partial string matching using regex (case-insensitive)
                { comment: { $regex: q, $options: "i" } },
                { characterName: { $regex: q, $options: "i" } },
                { corporationName: { $regex: q, $options: "i" } },
                { allianceName: { $regex: q, $options: "i" } },
            ],
        };

        // Execute search query with pagination
        const [comments, total] = await Promise.all([
            Comments.find(searchQuery)
                .sort(sort)
                .skip(skip)
                .limit(limitNum)
                .lean(),
            Comments.countDocuments(searchQuery),
        ]);

        // Calculate pagination info
        const totalPages = Math.ceil(total / limitNum);

        return {
            comments,
            pagination: {
                page: pageNum,
                pages: totalPages,
                total,
                limit: limitNum,
            },
        };
    } catch (error) {
        console.error("Error searching comments:", error);
        return createError({
            statusCode: 500,
            statusMessage: "Failed to search comments",
        });
    }
});
