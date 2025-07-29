import { cliLogger } from "~/server/helpers/Logger";
import { Comments } from "~/server/models/Comments";

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

        cliLogger.debug(
            `Fetching comments: characterId=${
                characterId || "all"
            }, page: ${page}, limit: ${limit}`
        );

        // Build query - only show non-deleted comments
        const commentQuery: any = {
            deleted: false,
        };

        // Add characterId filter if provided
        if (characterId) {
            commentQuery.characterId = parseInt(characterId);
        }

        // Get total count for pagination
        const total = await Comments.countDocuments(commentQuery);
        const totalPages = Math.ceil(total / limit);

        // Fetch comments, sorted by createdAt in descending order
        const comments = await Comments.find(commentQuery)
            .sort({ createdAt: -1 })
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
