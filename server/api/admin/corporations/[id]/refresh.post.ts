/**
 * Refresh corporation data from ESI
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

    const corporationId = event.context.params?.id;

    if (!corporationId) {
        throw createError({
            statusCode: 400,
            statusMessage: "Corporation ID is required",
        });
    }

    try {
        // Get current corporation data
        const existingCorporation = await Corporations.findOne({
            corporation_id: parseInt(corporationId),
        });

        if (!existingCorporation) {
            throw createError({
                statusCode: 404,
                statusMessage: "Corporation not found",
            });
        }

        // Get fresh data from ESI via getCorporation utility
        const freshCorporation = await getCorporation(
            parseInt(corporationId),
            true
        ); // Force update

        if (!freshCorporation) {
            throw createError({
                statusCode: 404,
                statusMessage: "Corporation not found in ESI",
            });
        }

        // Compare the two objects and detect changes
        const changes: string[] = [];

        if (existingCorporation.name !== freshCorporation.name) {
            changes.push(
                `Name: "${existingCorporation.name}" → "${freshCorporation.name}"`
            );
        }
        if (existingCorporation.ticker !== freshCorporation.ticker) {
            changes.push(
                `Ticker: "${existingCorporation.ticker}" → "${freshCorporation.ticker}"`
            );
        }
        if (existingCorporation.alliance_id !== freshCorporation.alliance_id) {
            const oldAlliance = existingCorporation.alliance_id || "None";
            const newAlliance = freshCorporation.alliance_id || "None";
            changes.push(`Alliance: ${oldAlliance} → ${newAlliance}`);
        }
        if (existingCorporation.ceo_id !== freshCorporation.ceo_id) {
            changes.push(
                `CEO ID: ${existingCorporation.ceo_id} → ${freshCorporation.ceo_id}`
            );
        }
        if (
            existingCorporation.member_count !== freshCorporation.member_count
        ) {
            changes.push(
                `Member Count: ${existingCorporation.member_count} → ${freshCorporation.member_count}`
            );
        }
        if (existingCorporation.tax_rate !== freshCorporation.tax_rate) {
            changes.push(
                `Tax Rate: ${existingCorporation.tax_rate}% → ${freshCorporation.tax_rate}%`
            );
        }

        if (changes.length === 0) {
            return {
                success: true,
                message: `Corporation "${existingCorporation.name}" is already up to date`,
                changes: [],
            };
        }

        return {
            success: true,
            message: `Corporation "${existingCorporation.name}" refreshed successfully`,
            changes,
        };
    } catch (error) {
        console.error("Error refreshing corporation:", error);
        throw createError({
            statusCode: 500,
            statusMessage: "Failed to refresh corporation data",
        });
    }
});
