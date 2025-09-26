import {
    getAlliance,
    getCharacter,
    getCorporation,
} from "../../helpers/ESIData";
import { UserService } from "~/server/services";

export default defineEventHandler(async (event) => {
    // Add cache-control headers to prevent caching
    setResponseHeaders(event, {
        "Cache-Control": "no-cache, no-store, must-revalidate",
        Pragma: "no-cache",
        Expires: "0",
    });

    // Only allow POST method
    if (getMethod(event) !== "POST") {
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

    // Find the user by uniqueIdentifier
    const user = await UserService.findByUniqueIdentifier(cookie);

    if (!user) {
        throw createError({
            statusCode: 401,
            statusMessage: "Invalid authentication",
        });
    }

    try {
        const refreshResults = {
            character: false,
            corporation: false,
            alliance: false,
            errors: [] as string[],
        };

        // Always refresh character data and get updated character info
        let characterData = null;
        try {
            characterData = await getCharacter(user.character_id, true); // force_update = true
            refreshResults.character = true;
        } catch (error) {
            const errorMessage =
                error instanceof Error ? error.message : String(error);
            refreshResults.errors.push(
                `Character refresh failed: ${errorMessage}`
            );
        }

        // Refresh corporation data if character has one
        if (
            characterData &&
            characterData.corporation_id &&
            characterData.corporation_id > 0
        ) {
            try {
                await getCorporation(characterData.corporation_id, true); // force_update = true
                refreshResults.corporation = true;
            } catch (error) {
                const errorMessage =
                    error instanceof Error ? error.message : String(error);
                refreshResults.errors.push(
                    `Corporation refresh failed: ${errorMessage}`
                );
            }
        }

        // Refresh alliance data if character has one
        if (
            characterData &&
            characterData.alliance_id &&
            characterData.alliance_id > 0
        ) {
            try {
                await getAlliance(characterData.alliance_id, true); // force_update = true
                refreshResults.alliance = true;
            } catch (error) {
                const errorMessage =
                    error instanceof Error ? error.message : String(error);
                refreshResults.errors.push(
                    `Alliance refresh failed: ${errorMessage}`
                );
            }
        }

        // Determine overall success
        const hasAnySuccess =
            refreshResults.character ||
            refreshResults.corporation ||
            refreshResults.alliance;
        const hasErrors = refreshResults.errors.length > 0;

        if (!hasAnySuccess) {
            throw createError({
                statusCode: 500,
                statusMessage: "Failed to refresh any ESI data",
                data: { details: refreshResults.errors },
            });
        }

        return {
            success: true,
            message: hasErrors
                ? "ESI data partially refreshed - some components failed"
                : "ESI data refreshed successfully",
            data: refreshResults,
        };
    } catch (error: any) {
        console.error("Error refreshing ESI data:", error);

        // If it's already a createError, re-throw it
        if (error.statusCode) {
            throw error;
        }

        throw createError({
            statusCode: 500,
            statusMessage: "Failed to refresh ESI data",
            data: { details: error.message || String(error) },
        });
    }
});
