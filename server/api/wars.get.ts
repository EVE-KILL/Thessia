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
            let filterQuery: any = {};
            let sortQuery: any = { started: -1 }; // Default sort by started date descending

            // Handle entity-based filtering
            if (entityId && entityType) {
                if (entityType === "corporation") {
                    filterQuery = {
                        $or: [
                            { "aggressor.corporation_id": entityId },
                            { "defender.corporation_id": entityId },
                            { "allies.corporation_id": entityId },
                        ],
                    };
                } else if (entityType === "alliance") {
                    filterQuery = {
                        $or: [
                            { "aggressor.alliance_id": entityId },
                            { "defender.alliance_id": entityId },
                            { "allies.alliance_id": entityId },
                        ],
                    };
                }
            }

            // Handle tab-specific filtering
            switch (tab) {
                case "recent":
                    // Recent activity - last 30 days
                    const thirtyDaysAgo = new Date();
                    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

                    filterQuery = {
                        ...filterQuery,
                        $or: [
                            { started: { $gte: thirtyDaysAgo } },
                            { finished: { $gte: thirtyDaysAgo } },
                        ],
                    };
                    break;
                case "all":
                default:
                    // All wars, default sorting
                    break;
            }

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
