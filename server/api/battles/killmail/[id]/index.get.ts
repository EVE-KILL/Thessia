import { getBattleData } from "~/server/helpers/Battles";

export default defineEventHandler(async (event) => {
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
});
