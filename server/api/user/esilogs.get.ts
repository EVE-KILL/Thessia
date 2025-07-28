/**
 * GET /api/user/esi-logs
 * Get ESI logs for the current user to show transparency
 */

import { ESILogs } from "~/server/models/ESILogs";
import { Users } from "~/server/models/Users";

export default defineEventHandler(async (event) => {
    // Add cache-control headers to prevent caching
    setResponseHeaders(event, {
        "Cache-Control": "no-cache, no-store, must-revalidate",
        Pragma: "no-cache",
        Expires: "0",
    });

    // Only allow GET method
    if (getMethod(event) !== "GET") {
        throw createError({
            statusCode: 405,
            statusMessage: "Method not allowed",
        });
    }

    // Get the cookie value using the hardcoded cookie name
    const cookieName = "evelogin";
    const cookie = getCookie(event, cookieName);

    if (!cookie) {
        throw createError({
            statusCode: 401,
            statusMessage: "Authentication required",
        });
    }

    // Find user by cookie value
    const user = await Users.findOne({ uniqueIdentifier: cookie });
    if (!user) {
        throw createError({
            statusCode: 401,
            statusMessage: "Invalid session",
        });
    }

    try {
        // Get query parameters for pagination
        const query = getQuery(event);
        const page = Math.max(1, parseInt(query.page as string) || 1);
        const limit = Math.min(
            1000,
            Math.max(1, parseInt(query.limit as string) || 50)
        );
        const skip = (page - 1) * limit;

        // Get ESI logs for this user, sorted by most recent first
        const logs = await ESILogs.find({ characterId: user.characterId })
            .sort({ timestamp: -1 })
            .skip(skip)
            .limit(limit)
            .lean();

        // Get total count for pagination
        const total = await ESILogs.countDocuments({
            characterId: user.characterId,
        });

        return {
            success: true,
            data: {
                logs,
                pagination: {
                    page,
                    limit,
                    total,
                    pages: Math.ceil(total / limit),
                },
            },
        };
    } catch (error) {
        console.error("Error fetching ESI logs:", error);
        throw createError({
            statusCode: 500,
            statusMessage: "Internal server error",
        });
    }
});
