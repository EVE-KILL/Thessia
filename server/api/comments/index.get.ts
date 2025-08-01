export default defineEventHandler(async (event) => {
    try {
        // Get query parameters
        const query = getQuery(event);
        const page = Math.max(1, parseInt(query.page as string) || 1);
        const limit = Math.min(
            250,
            Math.max(1, parseInt(query.limit as string) || 100)
        );
        const skip = (page - 1) * limit;
        const characterId = query.characterId as string;
        const corporationId = query.corporationId as string;
        const allianceId = query.allianceId as string;
        const sortBy = (query.sortBy as string) || "createdAt";
        const sortOrder = (query.sortOrder as string) || "desc";

        cliLogger.debug(
            `Fetching comments: characterId=${
                characterId || "all"
            }, corporationId=${corporationId || "all"}, allianceId=${
                allianceId || "all"
            }, page: ${page}, limit: ${limit}, sortBy: ${sortBy}, sortOrder: ${sortOrder}`
        );

        // Build query - only show non-deleted comments
        const commentQuery: any = {
            deleted: false,
        };

        // Add filters if provided
        if (characterId) {
            commentQuery.characterId = parseInt(characterId);
        }
        if (corporationId) {
            commentQuery.corporationId = parseInt(corporationId);
        }
        if (allianceId) {
            commentQuery.allianceId = parseInt(allianceId);
        }

        // Get total count for pagination
        const total = await Comments.countDocuments(commentQuery);
        const totalPages = Math.ceil(total / limit);

        // Build sort object
        const sortObject: any = {};

        // Handle different sort fields
        if (sortBy === "character") {
            sortObject.characterName = sortOrder === "desc" ? -1 : 1;
        } else if (sortBy === "corporation") {
            sortObject.corporationName = sortOrder === "desc" ? -1 : 1;
        } else if (sortBy === "alliance") {
            sortObject.allianceName = sortOrder === "desc" ? -1 : 1;
        } else {
            // Default to createdAt
            sortObject.createdAt = sortOrder === "desc" ? -1 : 1;
        }

        // Fetch comments with dynamic sorting
        const comments = await Comments.find(commentQuery)
            .sort(sortObject)
            .skip(skip)
            .limit(limit)
            .lean()
            .exec();

        return {
            comments,
            pagination: {
                page,
                limit,
                total,
                pages: totalPages,
                hasNext: page < totalPages,
                hasPrev: page > 1,
            },
        };
    } catch (error) {
        cliLogger.error(`Error fetching comments: ${error}`);
        return createError({
            statusCode: 500,
            statusMessage: "Failed to fetch comments",
        });
    }
});
