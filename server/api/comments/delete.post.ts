import { cliLogger } from "~/server/helpers/Logger";
import { Comments } from "~/server/models/Comments";
import { broadcastCommentEvent } from "~/server/routes/ws/comments";

export default defineEventHandler(async (event) => {
    // Get the authentication cookie
    const cookies = parseCookies(event);
    const token = cookies.evelogin;

    if (!token) {
        return createError({
            statusCode: 401,
            statusMessage: "Authentication required",
        });
    }

    try {
        // Get user data from the session
        const session = await $fetch("/api/auth/me", {
            headers: {
                cookie: `evelogin=${token}`,
            },
        }).catch(() => null);

        if (!session || !session.authenticated) {
            return createError({
                statusCode: 401,
                statusMessage: "Authentication failed",
            });
        }

        const user = session.user;

        // Check if user is an administrator or the comment author
        if (!user?.administrator && !user?.characterId) {
            return createError({
                statusCode: 403,
                statusMessage:
                    "Unauthorized: Only administrators or comment authors can delete comments",
            });
        }

        // Parse the request body
        const body = await readBody(event);
        const { identifier } = body;

        if (!identifier) {
            return createError({
                statusCode: 400,
                statusMessage: "Comment identifier is required",
            });
        }

        // Find the comment
        const comment = await Comments.findOne({ identifier });

        if (!comment) {
            return createError({
                statusCode: 404,
                statusMessage: "Comment not found",
            });
        }

        // Check if user is allowed to delete this comment
        const isCommentAuthor = user.characterId === comment.characterId;
        if (!user.administrator && !isCommentAuthor) {
            return createError({
                statusCode: 403,
                statusMessage: "You can only delete your own comments",
            });
        }

        // Mark comment as deleted
        comment.deleted = true;
        await comment.save();
        cliLogger.debug(
            `Deleted comment: ${identifier} by ${user.characterName}`
        );

        // Broadcast the deleted comment event so it can be removed from clients
        try {
            const commentData = comment.toJSON();
            await broadcastCommentEvent("deleted", commentData);
        } catch (broadcastError) {
            cliLogger.error(
                `Error broadcasting delete event: ${broadcastError}`
            );
        }

        return {
            success: true,
            message: "Comment removed",
        };
    } catch (error) {
        cliLogger.error(`Error deleting comment: ${error}`);
        return createError({
            statusCode: 500,
            statusMessage: "Failed to delete comment",
        });
    }
});
