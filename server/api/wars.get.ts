import { WarService } from "../services";

export default defineCachedEventHandler(
    async (event) => {
        const query = getQuery(event);
        const page = Number(query.page) || 1;
        const limit = Math.min(Number(query.limit) || 25, 100);
        const skip = (page - 1) * limit;
        const entityId = Number(query.entityId) || null;
        const entityType = query.entityType as string;
        const tab = (query.tab as string) || "all";

        // Extract filter parameters
        const ongoing = query.ongoing === "true";
        const mutual = query.mutual === "true";
        const openToAllies = query.openToAllies === "true";
        const hasActivity = query.hasActivity === "true";

        try {
            // Get wars using the service
            const { wars, pagination } = await WarService.searchWithPagination({
                page,
                limit,
                entityId,
                entityType: entityType as "corporation" | "alliance",
                tab,
                ongoing,
                mutual,
                openToAllies,
                hasActivity,
            });

            // Extract entity IDs and populate wars
            const { corporationIds, allianceIds } =
                WarService.extractEntityIds(wars);
            const populatedWars = await WarService.populateWarEntities(
                wars,
                corporationIds,
                allianceIds
            );

            return {
                wars: populatedWars,
                totalItems: pagination.totalCount,
                totalPages: pagination.totalPages,
                currentPage: pagination.currentPage,
                itemsPerPage: limit,
            };
        } catch (error) {
            console.error("Wars API error:", error);
            throw createError({
                statusCode: 500,
                statusMessage: "Failed to fetch wars",
            });
        }
    },
    {
        maxAge: 60 * 5, // 5 minutes cache
        getKey: (event) => {
            const query = getQuery(event);
            return `wars-${JSON.stringify(query)}`;
        },
    }
);
