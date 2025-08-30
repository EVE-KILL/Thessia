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

    const commentId = getRouterParam(event, "id");

    if (!commentId) {
        throw createError({
            statusCode: 400,
            statusMessage: "Comment ID is required",
        });
    }

    try {
        // Find the comment
        const comment = await Comments.findById(commentId);

        if (!comment) {
            throw createError({
                statusCode: 404,
                statusMessage: "Comment not found",
            });
        }

        // Check if comment is actually deleted
        if (!comment.deleted_at) {
            throw createError({
                statusCode: 400,
                statusMessage: "Comment is not deleted",
            });
        }

        // Restore the comment by removing the deleted_at field
        const updatedComment = await Comments.findByIdAndUpdate(
            commentId,
            {
                $unset: { deleted_at: 1 },
            },
            { new: true }
        );

        return {
            success: true,
            message: "Comment restored successfully",
            comment: updatedComment,
        };
    } catch (error) {
        console.error("Error restoring comment:", error);

        if (error.statusCode) {
            throw error;
        }

        throw createError({
            statusCode: 500,
            statusMessage: "Failed to restore comment",
        });
    }
});
