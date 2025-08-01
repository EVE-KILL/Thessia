export default defineCachedEventHandler(
    async (event) => {
        const killmail_id = event.context.params?.id;

        if (!killmail_id) {
            throw createError({
                statusCode: 400,
                statusMessage: "Killmail ID is required",
            });
        }

        const killmailId = parseInt(killmail_id as string, 10);
        const inBattle = await isKillInBattle(killmailId);

        return {
            inBattle: inBattle,
        };
    },
    {
        maxAge: 300,
        staleMaxAge: -1,
        swr: true,
        base: "redis",
        shouldBypassCache: (event) => {
            return process.env.NODE_ENV !== "production";
        },
        getKey: (event) => {
            const idParam = event.context.params?.id;
            return `battles:killmail:${idParam}:inbattle`;
        },
    }
);
