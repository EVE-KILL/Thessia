import { USER_SETTINGS_REGISTRY } from "../../interfaces/IUserSettings";

export default defineEventHandler(async (event) => {
    try {
        // Return the complete settings registry for the frontend to use
        return {
            success: true,
            data: USER_SETTINGS_REGISTRY,
        };
    } catch (error: any) {
        console.error("[Settings Registry API] Error:", error);

        throw createError({
            statusCode: 500,
            statusMessage: "Failed to load settings registry",
        });
    }
});
