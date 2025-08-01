import {
    createError,
    defineEventHandler,
    getCookie,
    getMethod,
    getRouterParam,
    readBody,
    setResponseHeaders,
} from "h3";

export default defineEventHandler(async (event) => {
    // Add cache-control headers to prevent caching
    setResponseHeaders(event, {
        "Cache-Control": "no-cache, no-store, must-revalidate",
        Pragma: "no-cache",
        Expires: "0",
    });

    // Only allow PATCH method
    if (getMethod(event) !== "PATCH") {
        throw createError({
            statusCode: 405,
            statusMessage: "Method not allowed",
        });
    }

    // Get authentication cookie
    const cookieName = "evelogin";
    const cookie = getCookie(event, cookieName);

    if (!cookie) {
        throw createError({
            statusCode: 401,
            statusMessage: "Authentication required",
        });
    }

    // Find user by cookie value
    const user = await Users.findOne({ uniqueIdentifier: cookie });
    if (!user) {
        throw createError({
            statusCode: 401,
            statusMessage: "Invalid session",
        });
    }

    // Check if user is administrator
    if (!user.administrator) {
        throw createError({
            statusCode: 403,
            statusMessage: "Administrator access required",
        });
    }

    // Get user ID from route params
    const userId = getRouterParam(event, "id");

    if (!userId) {
        throw createError({
            statusCode: 400,
            statusMessage: "User ID is required",
        });
    }

    try {
        // Get the request body with action data
        const { action, value } = await readBody(event);

        if (!action) {
            throw createError({
                statusCode: 400,
                statusMessage: "Action is required",
            });
        }

        // Find the target user
        const targetUser = await Users.findOne({
            characterId: parseInt(userId),
        });
        if (!targetUser) {
            throw createError({
                statusCode: 404,
                statusMessage: "User not found",
            });
        }

        let updateData: any = {};
        let message = "";

        switch (action) {
            case "toggleAdmin":
                // Prevent users from removing their own admin status
                if (targetUser.characterId === user.characterId) {
                    throw createError({
                        statusCode: 400,
                        statusMessage: "Cannot modify your own admin status",
                    });
                }

                updateData.administrator = !targetUser.administrator;
                message = `User ${
                    targetUser.administrator ? "removed from" : "granted"
                } administrator privileges`;
                break;

            case "updateSettings":
                if (!value || typeof value !== "object") {
                    throw createError({
                        statusCode: 400,
                        statusMessage:
                            "Settings value is required and must be an object",
                    });
                }

                updateData.settings = value;
                message = "User settings updated successfully";
                break;

            default:
                throw createError({
                    statusCode: 400,
                    statusMessage: `Unknown action: ${action}`,
                });
        }

        // Update the user
        const updatedUser = await Users.findOneAndUpdate(
            { characterId: parseInt(userId) },
            updateData,
            {
                new: true, // Return updated document
                runValidators: true, // Run schema validation
            }
        ).lean();

        if (!updatedUser) {
            throw createError({
                statusCode: 404,
                statusMessage: "User not found",
            });
        }

        // Remove sensitive data from response
        const { accessToken, refreshToken, ...safeUser } = updatedUser;

        return {
            success: true,
            user: safeUser,
            message,
        };
    } catch (error: any) {
        cliLogger.error(`Error updating user ${userId}: ${error}`);

        // Handle validation errors
        if (error?.name === "ValidationError") {
            throw createError({
                statusCode: 400,
                statusMessage: `Validation error: ${error.message}`,
            });
        }

        // Handle cast errors (invalid ObjectId, etc.)
        if (error?.name === "CastError") {
            throw createError({
                statusCode: 400,
                statusMessage: `Invalid data format: ${error.message}`,
            });
        }

        // Re-throw createError instances
        if (error.statusCode) {
            throw error;
        }

        throw createError({
            statusCode: 500,
            statusMessage: `Failed to update user`,
        });
    }
});
