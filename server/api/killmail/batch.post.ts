export default defineEventHandler(async (event) => {
    const body = await readBody(event);
    const { ids } = body;

    if (!Array.isArray(ids) || ids.some(isNaN)) {
        throw createError({
            statusCode: 400,
            statusMessage:
                "Invalid request body. Expected an array of killmail IDs.",
        });
    }

    try {
        const killmails: IKillmail[] = await Killmails.find({
            killmail_id: { $in: ids },
        }).lean();

        return killmails;
    } catch (error: any) {
        console.error("Error fetching killmails by batch ID:", error);
        throw createError({
            statusCode: 500,
            statusMessage: "Error fetching killmails.",
            cause: error,
        });
    }
});
