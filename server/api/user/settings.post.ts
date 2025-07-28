import { getUserSettingsHelper } from "~/server/helpers/UserSettings";
import type { IUserSettingsMap } from "~/server/interfaces/IUserSettings";
import { Users } from "~/server/models/Users";

export default defineEventHandler(async (event) => {
    // Add cache-control headers to prevent caching
    setResponseHeaders(event, {
        "Cache-Control": "no-cache, no-store, must-revalidate",
        Pragma: "no-cache",
        Expires: "0",
    });

    // Only allow POST method
    if (getMethod(event) !== "POST") {
        throw createError({
            statusCode: 405,
            statusMessage: "Method not allowed",
        });
    }

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

    try {
        // Get the request body
        const body = await readBody(event);

        // Validate the settings object
        if (!body || typeof body !== "object") {
            throw createError({
                statusCode: 400,
                statusMessage: "Invalid request body",
            });
        }

        // Use the helper to update user settings
        const settingsHelper = getUserSettingsHelper(user);
        await settingsHelper.setSettings(body as Partial<IUserSettingsMap>);

        // Return updated settings
        const updatedSettings = settingsHelper.getAllSettings();

        return {
            success: true,
            settings: updatedSettings,
            message: "Settings updated successfully",
        };
    } catch (error: any) {
        console.error("Error updating user settings:", error);

        if (error.message && error.message.includes("Invalid value")) {
            throw createError({
                statusCode: 400,
                statusMessage: error.message,
            });
        }

        throw createError({
            statusCode: 500,
            statusMessage: "Failed to update settings",
        });
    }
});
