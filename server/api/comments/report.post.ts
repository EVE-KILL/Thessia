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

        // Parse the request body
        const body = await readBody(event);
        cliLogger.debug(
            `Received comment report request: ${JSON.stringify(body)}`
        );

        const { identifier, reportMessage } = body;

        if (!identifier) {
            return createError({
                statusCode: 400,
                statusMessage: "Comment identifier is required",
            });
        }

        if (!reportMessage || reportMessage.trim() === "") {
            return createError({
                statusCode: 400,
                statusMessage: "Report message is required",
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

        // Prevent users from reporting their own comments
        if (user.characterId === comment.characterId) {
            return createError({
                statusCode: 400,
                statusMessage: "You cannot report your own comment",
            });
        }

        // Add report to the comment
        const report = {
            reporterId: user.characterId,
            reporterName: user.characterName,
            message: reportMessage.trim(),
        };

        comment.reported = true;
        if (!comment.reportMessages) {
            comment.reportMessages = [];
        }
        comment.reportMessages.push(report);

        await comment.save();

        // Send notification to Discord
        await DiscordWebhooks.sendReportedComment(
            comment.toJSON(),
            reportMessage.trim(),
            {
                characterId: user.characterId,
                characterName: user.characterName,
            }
        );

        cliLogger.debug(
            `Comment ${identifier} reported by ${user.characterName}: ${reportMessage}`
        );

        return {
            success: true,
            message: "Comment reported successfully",
        };
    } catch (error) {
        cliLogger.error(`Error reporting comment: ${error}`);
        return createError({
            statusCode: 500,
            statusMessage: "Failed to report comment",
        });
    }
});
