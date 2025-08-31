/**
 * Delete corporation (soft delete)
 * Marks corporation as deleted without removing from database
 */
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

    const corporationId = event.context.params?.id;

    if (!corporationId) {
        throw createError({
            statusCode: 400,
            statusMessage: "Corporation ID is required",
        });
    }

    try {
        // Find the corporation
        const corporation = await Corporations.findOne({
            corporation_id: parseInt(corporationId),
        });

        if (!corporation) {
            throw createError({
                statusCode: 404,
                statusMessage: "Corporation not found",
            });
        }

        // Soft delete the corporation
        await Corporations.updateOne(
            { corporation_id: parseInt(corporationId) },
            { $set: { deleted: true } }
        );

        return {
            success: true,
            message: `Corporation "${corporation.name}" has been deleted successfully`,
        };
    } catch (error) {
        console.error("Error deleting corporation:", error);

        // Re-throw createError instances
        if (error.statusCode) {
            throw error;
        }

        throw createError({
            statusCode: 500,
            statusMessage: "Failed to delete corporation",
        });
    }
});
