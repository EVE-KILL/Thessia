import { getMetenoxMoons } from "./_utils";

/**
 * Get all Metenox moon locations based on killmails
 * @param event - The Nitro event
 * @returns Array of all Metenox moon locations with classification
 */
export default defineCachedEventHandler(
    async (event) => {
        try {
            const results = await getMetenoxMoons();
            return results;
        } catch (error) {
            console.error("Error in metenox all endpoint:", error);
            throw createError({
                statusCode: 500,
                statusMessage: "Internal Server Error",
            });
        }
    },
    {
        maxAge: 86400, // Cache for 24 hours
        staleMaxAge: -1,
        swr: true,
        shouldBypassCache: (event) => {
            return process.env.NODE_ENV !== "production";
        },
        getKey: (event) => {
            return "intel:metenox:all";
        },
    }
);
