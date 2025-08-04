export default defineEventHandler(async (event) => {
    // Authenticate user
    const user = await requireUserAuth(event);

    const body = await readBody(event);
    const { key, value, characterId, corporationId, allianceId, all } = body;

    if (!key || value === undefined) {
        throw createError({
            statusCode: 400,
            statusMessage: "Missing key or value",
        });
    }

    try {
        // Create or update configuration
        const configData = {
            characterId: characterId || null,
            corporationId: corporationId || null,
            allianceId: allianceId || null,
            all: all || false,
            key,
            value,
        };

        const configuration = await Configuration.findOneAndUpdate(
            {
                characterId: configData.characterId,
                corporationId: configData.corporationId,
                allianceId: configData.allianceId,
                all: configData.all,
                key: configData.key,
            },
            configData,
            { upsert: true, new: true }
        );

        return {
            configuration,
        };
    } catch (error: any) {
        if (error.statusCode) {
            throw error;
        }

        throw createError({
            statusCode: 500,
            statusMessage: "Failed to save configuration",
        });
    }
});
