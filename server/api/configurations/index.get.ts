export default defineEventHandler(async (event) => {
    const query = getQuery(event);
    const { characterId, corporationId, allianceId } = query;

    // Build MongoDB query based on provided context
    const queryConditions: any[] = [];

    if (characterId) {
        queryConditions.push({ characterId: Number(characterId) });
    }
    if (corporationId) {
        queryConditions.push({ corporationId: Number(corporationId) });
    }
    if (allianceId) {
        queryConditions.push({ allianceId: Number(allianceId) });
    }
    // Always include global configurations
    queryConditions.push({ all: true });

    const configurations = await Configuration.find({
        $or: queryConditions.length > 0 ? queryConditions : [{ all: true }],
    });

    return {
        configurations,
    };
});
