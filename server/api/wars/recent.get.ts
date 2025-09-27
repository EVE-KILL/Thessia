import { WarService } from "../../services";

export default defineCachedEventHandler(
    async (event) => {
        try {
            // Get recent wars by categories using the service
            const {
                recentOpenToAllies,
                recentMutual,
                recentOther,
                recentFinished,
            } = await WarService.getRecentByCategories();

            // Combine all wars to extract entity IDs
            const allWars = [
                ...recentOpenToAllies,
                ...recentMutual,
                ...recentOther,
                ...recentFinished,
            ];
            const { corporationIds, allianceIds } =
                WarService.extractEntityIds(allWars);

            // Populate each category with entity data
            const [
                populatedOpenToAllies,
                populatedMutual,
                populatedOther,
                populatedFinished,
            ] = await Promise.all([
                WarService.populateWarEntities(
                    recentOpenToAllies,
                    corporationIds,
                    allianceIds
                ),
                WarService.populateWarEntities(
                    recentMutual,
                    corporationIds,
                    allianceIds
                ),
                WarService.populateWarEntities(
                    recentOther,
                    corporationIds,
                    allianceIds
                ),
                WarService.populateWarEntities(
                    recentFinished,
                    corporationIds,
                    allianceIds
                ),
            ]);

            return {
                recentOpenToAllies: populatedOpenToAllies,
                recentMutual: populatedMutual,
                recentOther: populatedOther,
                recentFinished: populatedFinished,
            };
        } catch (error) {
            console.error("Wars recent API error:", error);
            throw createError({
                statusCode: 500,
                statusMessage: "Failed to fetch recent wars",
            });
        }
    },
    {
        maxAge: 60 * 2, // 2 minutes cache (reduced from 5 for better freshness)
        getKey: () => "wars-recent",
    }
);
