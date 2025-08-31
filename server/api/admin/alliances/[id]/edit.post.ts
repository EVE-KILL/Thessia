/**
 * Edit alliance data
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
        const body = await readBody(event);
        const {
            name,
            ticker,
            executor_corporation_id,
            creator_id,
            creator_corporation_id,
        } = body;

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

        // Build update object
        const updateData: any = {};

        if (name !== undefined && name !== alliance.name) {
            updateData.name = name;
        }
        if (ticker !== undefined && ticker !== alliance.ticker) {
            updateData.ticker = ticker;
        }
        if (
            executor_corporation_id !== undefined &&
            executor_corporation_id !== alliance.executor_corporation_id
        ) {
            updateData.executor_corporation_id =
                executor_corporation_id || null;
        }
        if (creator_id !== undefined && creator_id !== alliance.creator_id) {
            updateData.creator_id = creator_id || null;
        }
        if (
            creator_corporation_id !== undefined &&
            creator_corporation_id !== alliance.creator_corporation_id
        ) {
            updateData.creator_corporation_id = creator_corporation_id || null;
        }

        // Always update the updatedAt timestamp
        updateData.updatedAt = new Date();

        // Update the alliance
        await Alliances.updateOne(
            { alliance_id: parseInt(allianceId) },
            { $set: updateData }
        );

        return {
            success: true,
            message: `Alliance "${alliance.name}" updated successfully`,
            alliance_id: parseInt(allianceId),
        };
    } catch (error) {
        console.error("Error editing alliance:", error);
        throw createError({
            statusCode: 500,
            statusMessage: "Failed to edit alliance",
        });
    }
});
