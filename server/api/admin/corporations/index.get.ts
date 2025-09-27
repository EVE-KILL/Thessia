import { CorporationService, UserService } from "../../../services";

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
    const user = await UserService.findByUniqueIdentifier(cookie);

    if (!user) {
        throw createError({
            statusCode: 401,
            statusMessage: "Invalid authentication",
        });
    }

    // Only allow administrators
    if (user.role !== "admin") {
        throw createError({
            statusCode: 403,
            statusMessage: "Access denied. Administrator privileges required.",
        });
    }

    try {
        const query = getQuery(event);
        const page = parseInt(query.page as string) || 1;
        const limit = Math.min(parseInt(query.limit as string) || 25, 100); // Cap at 100
        const search = (query.search as string) || "";

        // Use the CorporationService to search with pagination
        const result = await CorporationService.searchWithPagination({
            search: search || undefined,
            page,
            limit,
        });

        return {
            corporations: result.corporations.map((corp) => ({
                corporation_id: corp.corporation_id,
                name: corp.name,
                ticker: corp.ticker,
                alliance_id: corp.alliance_id,
                // alliance_name would need to be fetched via relation or separate query
                ceo_id: corp.ceo_id,
                member_count: corp.member_count,
                tax_rate: corp.tax_rate,
                deleted: corp.deleted,
                createdAt: corp.created_at,
                updatedAt: corp.updated_at,
            })),
            pagination: result.pagination,
        };
    } catch (error) {
        console.error("Error fetching corporations:", error);
        throw createError({
            statusCode: 500,
            statusMessage: "Internal server error",
        });
    }
});
