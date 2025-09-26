import { AllianceService } from "../../../services/AllianceService";
import { UserService } from "../../../services/UserService";

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

        // Use the AllianceService to search with pagination
        const result = await AllianceService.searchWithPagination({
            search: search || undefined,
            page,
            limit,
        });

        return result;
    } catch (error) {
        console.error("Error fetching alliances:", error);
        throw createError({
            statusCode: 500,
            statusMessage: "Internal Server Error",
        });
    }
});
