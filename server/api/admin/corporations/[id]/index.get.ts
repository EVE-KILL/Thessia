/**
 * Get full corporation details for admin editing
 * Returns corporation data with related entity names
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
        // Get full corporation details
        const corporation = await Corporations.findOne({
            corporation_id: parseInt(corporationId),
        });

        if (!corporation) {
            throw createError({
                statusCode: 404,
                statusMessage: "Corporation not found",
            });
        }

        // Get related entity names
        const names: any = {};

        // Get alliance name if exists
        if (corporation.alliance_id) {
            const alliance = await Alliances.findOne({
                alliance_id: corporation.alliance_id,
            }).select("name");
            names.allianceName = alliance?.name || null;
        }

        // Get CEO name if exists
        if (corporation.ceo_id) {
            const ceo = await Characters.findOne({
                character_id: corporation.ceo_id,
            }).select("name");
            names.ceoName = ceo?.name || null;
        }

        return {
            corporation: corporation.toJSON(),
            names,
        };
    } catch (error) {
        console.error("Error fetching corporation details:", error);

        // Re-throw createError instances
        if (error.statusCode) {
            throw error;
        }

        throw createError({
            statusCode: 500,
            statusMessage: "Failed to fetch corporation details",
        });
    }
});
