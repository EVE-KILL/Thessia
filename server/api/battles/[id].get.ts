export default defineCachedEventHandler(
    async (event) => {
        const idParam = event.context.params?.id;
        // Default to true to ensure data is available for all tabs
        const includeKillmails =
            event.context.query?.includeKillmails !== "false";

        if (!idParam) {
            throw createError({
                statusCode: 400,
                statusMessage: "Battle ID parameter is missing",
            });
        }

        const battleId = parseInt(idParam, 10);

        if (isNaN(battleId)) {
            throw createError({
                statusCode: 400,
                statusMessage: "Invalid Battle ID format",
            });
        }

        try {
            // Get battle data with lean() to get a plain JS object
            const rawBattle = await Battles.findOne({
                battle_id: battleId,
            }).lean();

            if (!rawBattle) {
                throw createError({
                    statusCode: 404,
                    statusMessage: "battle not found",
                });
            }

            // Process the battle data using the helper function
            const processedBattle = await processBattleDataForFrontend(
                rawBattle,
                includeKillmails
            );

            return processedBattle;
        } catch (error: any) {
            if (error.name === "CastError") {
                throw createError({
                    statusCode: 400,
                    statusMessage: "Invalid Battle ID format",
                });
            }
            if (error.statusCode === 404) {
                throw error;
            }
            console.error(`Error fetching battle with ID ${battleId}:`, error);
            throw createError({
                statusCode: 500,
                statusMessage: "Internal Server Error fetching battle",
            });
        }
    },
    {
        maxAge: 300,
        staleMaxAge: -1,
        swr: true,
        shouldBypassCache: (event) => {
            return process.env.NODE_ENV !== "production";
        },
        getKey: (event) => {
            const battleId = event.context.params?.id;
            const includeKillmails =
                event.context.query?.includeKillmails !== "false";
            if (!battleId) {
                throw createError({
                    statusCode: 500,
                    statusMessage: "Battle ID not found in context",
                });
            }
            return `battles:${battleId}:${
                includeKillmails ? "with-killmails" : "index"
            }`;
        },
    }
);
