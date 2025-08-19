export default defineCachedEventHandler(
    async (event) => {
        const killmail_id = event.context.params?.id;
        // Default to true to ensure data is available for all tabs
        const includeKillmails =
            event.context.query?.includeKillmails !== "false";

        if (!killmail_id) {
            throw createError({
                statusCode: 400,
                statusMessage: "Killmail ID is required",
            });
        }

        const killmailId = parseInt(killmail_id as string, 10);
        const rawBattleData = await getBattleData(killmailId);

        if (!rawBattleData) {
            return null;
        }

        // Process the battle data using the helper function
        const processedBattle = await processBattleDataForFrontend(
            rawBattleData,
            includeKillmails
        );

        return processedBattle;
    },
    {
        maxAge: 300,
        staleMaxAge: -1,
        swr: true,
        base: "redis",
        getKey: (event) => {
            const idParam = event.context.params?.id;
            const includeKillmails =
                event.context.query?.includeKillmails !== "false";
            return `battles:killmail:${idParam}:${
                includeKillmails ? "with-killmails" : "index"
            }`;
        },
    }
);
