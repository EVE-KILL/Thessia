import { getBattleData } from "~/server/helpers/Battles";

export default defineCachedEventHandler(async (event) => {
    const killmail_id = event.context.params?.id;

    if (!killmail_id) {
        throw createError({
            statusCode: 400,
            statusMessage: "Killmail ID is required",
        });
    }

    const killmailId = parseInt(killmail_id as string, 10);
    const battleData = await getBattleData(killmailId);

    return battleData;
}, {
    maxAge: 300,
    staleMaxAge: -1,
    swr: true,
    base: "redis",
    getKey: (event) => {
        const idParam = event.context.params?.id;
        return `battles:killmail:${idParam}:index`;
    },
    shouldBypassCache: (event) => {
        return process.env.NODE_ENV !== "production";
    }
});
