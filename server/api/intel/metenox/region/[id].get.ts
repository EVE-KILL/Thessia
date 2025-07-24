import { getMetenoxMoons } from "../_utils";

/**
 * Get Metenox moon locations for a specific region
 * @param event - The Nitro event
 * @returns Array of Metenox moon locations with classification for the specified region
 */
export default defineCachedEventHandler(
    async (event) => {
        try {
            // @ts-ignore - Type compatibility issue with nitro/h3 versions
            const regionId = parseInt(getRouterParam(event, "id") as string);

            if (!regionId || isNaN(regionId)) {
                throw createError({
                    statusCode: 400,
                    statusMessage: "Invalid region ID",
                });
            }

            const results = await getMetenoxMoons(null, regionId);
            return results;
        } catch (error) {
            console.error("Error in metenox region endpoint:", error);
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
        shouldBypassCache: (event) => {
            return process.env.NODE_ENV !== "production";
        },
        getKey: (event) => {
            // @ts-ignore - Type compatibility issue with nitro/h3 versions
            const regionId = getRouterParam(event, "id");
            return `intel:metenox:region_${regionId}`;
        },
    }
);
