import { getUserSettingsHelper } from "~/server/helpers/UserSettings";
import { Users } from "~/server/models/Users";

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

    try {
        // Get user settings using the helper
        const settingsHelper = getUserSettingsHelper(user);
        const settings = settingsHelper.getAllSettings();

        return {
            success: true,
            settings,
        };
    } catch (error) {
        console.error("Error fetching user settings:", error);
        throw createError({
            statusCode: 500,
            statusMessage: "Failed to fetch user settings",
        });
    }
});
