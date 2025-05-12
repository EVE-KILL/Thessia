
export default defineEventHandler(async (event) => {
    const battle_id = event.context.params?.id;

    if (!battle_id) {
        throw createError({
            statusCode: 400,
            statusMessage: "Killmail ID is required",
        });
    }

    const battleId = parseInt(battle_id as string, 10);
    const battleData = await Battles.findOne({ battle_id: battleId }).lean();

    return battleData;
});
