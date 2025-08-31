/**
 * Delete alliance (soft delete)
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

    const allianceId = event.context.params?.id;

    if (!allianceId) {
        throw createError({
            statusCode: 400,
            statusMessage: "Alliance ID is required",
        });
    }

    try {
        // Find the alliance
        const alliance = await Alliances.findOne({
            alliance_id: parseInt(allianceId),
        });

        if (!alliance) {
            throw createError({
                statusCode: 404,
                statusMessage: "Alliance not found",
            });
        }

        // Soft delete the alliance
        await Alliances.updateOne(
            { alliance_id: parseInt(allianceId) },
            {
                $set: {
                    deleted: true,
                    updatedAt: new Date(),
                },
            }
        );

        return {
            success: true,
            message: `Alliance "${alliance.name}" has been deleted`,
            alliance_id: parseInt(allianceId),
        };
    } catch (error) {
        console.error("Error deleting alliance:", error);
        throw createError({
            statusCode: 500,
            statusMessage: "Failed to delete alliance",
        });
    }
});
