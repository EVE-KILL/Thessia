export default defineEventHandler(async (event) => {
    const method = getMethod(event);

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

    const commentId = getRouterParam(event, "id");

    if (!commentId) {
        throw createError({
            statusCode: 400,
            statusMessage: "Comment ID is required",
        });
    }

    try {
        if (method === "DELETE") {
            // Delete comment
            const deletedComment = await Comments.findByIdAndDelete(commentId);

            if (!deletedComment) {
                throw createError({
                    statusCode: 404,
                    statusMessage: "Comment not found",
                });
            }

            return {
                success: true,
                message: "Comment deleted successfully",
                comment: deletedComment,
            };
        }

        if (method === "PUT" || method === "PATCH") {
            // Edit comment
            const body = await readBody(event);
            const { comment: newCommentText } = body;

            if (!newCommentText || typeof newCommentText !== "string") {
                throw createError({
                    statusCode: 400,
                    statusMessage: "Comment text is required",
                });
            }

            const updatedComment = await Comments.findByIdAndUpdate(
                commentId,
                {
                    comment: newCommentText,
                    updatedAt: new Date(),
                },
                { new: true }
            );

            if (!updatedComment) {
                throw createError({
                    statusCode: 404,
                    statusMessage: "Comment not found",
                });
            }

            return {
                success: true,
                message: "Comment updated successfully",
                comment: updatedComment,
            };
        }

        throw createError({
            statusCode: 405,
            statusMessage: "Method not allowed",
        });
    } catch (error) {
        console.error(`Error processing comment ${commentId}:`, error);
        throw createError({
            statusCode: 500,
            statusMessage: "Failed to process comment",
        });
    }
});
