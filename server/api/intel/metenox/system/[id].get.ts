import { getMetenoxMoons } from "../_utils";

/**
 * Get Metenox moon locations for a specific system
 * @param event - The Nitro event
 * @returns Array of Metenox moon locations with classification for the specified system
 */
export default defineCachedEventHandler(
    async (event) => {
        try {
            // @ts-ignore - Type compatibility issue with nitro/h3 versions
            const systemId = parseInt(getRouterParam(event, "id") as string);

            if (!systemId || isNaN(systemId)) {
                throw createError({
                    statusCode: 400,
                    statusMessage: "Invalid system ID",
                });
            }

            const results = await getMetenoxMoons(systemId, null);
            return results;
        } catch (error) {
            console.error("Error in metenox system endpoint:", error);
            throw createError({
                statusCode: 500,
                statusMessage: "Internal Server Error",
            });
        }
    },
    {
        maxAge: 3600, // Cache for 1 hour
        staleMaxAge: -1,
        swr: true,
        base: "redis",
        getKey: (event) => {
            // @ts-ignore - Type compatibility issue with nitro/h3 versions
            const systemId = getRouterParam(event, "id");
            return `intel:metenox:system_${systemId}`;
        },
    }
);
