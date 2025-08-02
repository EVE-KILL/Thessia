export default defineEventHandler(async (event) => {
    // Authenticate and verify admin privileges
    await requireAdminAuth(event);

    try {
        // Get the API key ID from route parameters
        const keyId = getRouterParam(event, "id");

        if (!keyId) {
            throw createError({
                statusCode: 400,
                statusMessage: "API key ID is required",
            });
        }

        // Find and delete the API key
        const deletedKey = await ApiKeys.findOneAndDelete({ _id: keyId });

        if (!deletedKey) {
            throw createError({
                statusCode: 404,
                statusMessage: "API key not found",
            });
        }

        return {
            success: true,
            message: "API key deleted successfully",
            data: {
                name: deletedKey.name,
                deletedAt: new Date(),
            },
        };
    } catch (error: any) {
        // If it's already a createError, re-throw it
        if (error.statusCode) {
            throw error;
        }

        // Handle invalid ObjectId errors
        if (error.name === "CastError") {
            throw createError({
                statusCode: 400,
                statusMessage: "Invalid API key ID format",
            });
        }

        throw createError({
            statusCode: 500,
            statusMessage: "Failed to delete API key",
        });
    }
});
