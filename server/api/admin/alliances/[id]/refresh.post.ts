/**
 * Refresh alliance data from ESI
 * Compares existing data with ESI data and only updates when changes are detected
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
        // Get current alliance data
        const existingAlliance = await Alliances.findOne({
            alliance_id: parseInt(allianceId),
        });

        if (!existingAlliance) {
            throw createError({
                statusCode: 404,
                statusMessage: "Alliance not found",
            });
        }

        // Get fresh data from ESI via getAlliance utility
        const freshAlliance = await getAlliance(parseInt(allianceId), true); // Force update

        if (!freshAlliance) {
            throw createError({
                statusCode: 404,
                statusMessage: "Alliance not found in ESI",
            });
        }

        // Compare the two objects and detect changes
        const changes: string[] = [];

        if (existingAlliance.name !== freshAlliance.name) {
            changes.push(
                `Name: "${existingAlliance.name}" → "${freshAlliance.name}"`
            );
        }
        if (existingAlliance.ticker !== freshAlliance.ticker) {
            changes.push(
                `Ticker: "${existingAlliance.ticker}" → "${freshAlliance.ticker}"`
            );
        }
        if (
            existingAlliance.executor_corporation_id !==
            freshAlliance.executor_corporation_id
        ) {
            const oldExecutor =
                existingAlliance.executor_corporation_id || "None";
            const newExecutor = freshAlliance.executor_corporation_id || "None";
            changes.push(
                `Executor Corporation: ${oldExecutor} → ${newExecutor}`
            );
        }
        if (existingAlliance.creator_id !== freshAlliance.creator_id) {
            changes.push(
                `Creator ID: ${existingAlliance.creator_id} → ${freshAlliance.creator_id}`
            );
        }
        if (
            existingAlliance.creator_corporation_id !==
            freshAlliance.creator_corporation_id
        ) {
            changes.push(
                `Creator Corporation ID: ${existingAlliance.creator_corporation_id} → ${freshAlliance.creator_corporation_id}`
            );
        }

        // Handle date comparison (handle potential timezone/format differences)
        if (existingAlliance.date_founded && freshAlliance.date_founded) {
            const existingDate = new Date(
                existingAlliance.date_founded
            ).getTime();
            const newDate = new Date(freshAlliance.date_founded).getTime();
            if (existingDate !== newDate) {
                changes.push(
                    `Date Founded: ${existingAlliance.date_founded} → ${freshAlliance.date_founded}`
                );
            }
        }

        if (changes.length === 0) {
            return {
                success: true,
                message: `Alliance "${existingAlliance.name}" is already up to date`,
                changes: [],
            };
        }

        return {
            success: true,
            message: `Alliance "${existingAlliance.name}" refreshed successfully`,
            changes,
        };
    } catch (error) {
        console.error("Error refreshing alliance:", error);
        throw createError({
            statusCode: 500,
            statusMessage: "Failed to refresh alliance data",
        });
    }
});
