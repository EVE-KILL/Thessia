export default defineEventHandler(async (event) => {
    const identifier = event.context.params?.identifier;

    if (!identifier) {
        cliLogger.error("Comment API called without identifier");
        return createError({
            statusCode: 400,
            statusMessage: "Identifier is required",
        });
    }

    try {
        // Always hide deleted comments from everyone
        const query = {
            killIdentifier: identifier,
            deleted: false,
        };

        // Fetch comments for the given kill identifier, sorted by createdAt in descending order
        const comments = await Comments.find(query)
            .sort({ createdAt: -1 })
            .lean()
            .exec();

        return comments;
    } catch (error) {
        cliLogger.error(`Error fetching comments: ${error}`);
        return createError({
            statusCode: 500,
            statusMessage: "Failed to fetch comments",
        });
    }
});
