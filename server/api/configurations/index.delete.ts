export default defineEventHandler(async (event) => {
    // Authenticate user
    const user = await requireUserAuth(event);

    const body = await readBody(event);
    const { key, characterId, corporationId, allianceId, all } = body;

    if (!key) {
        throw createError({
            statusCode: 400,
            statusMessage: "Missing key",
        });
    }

    try {
        // Delete configuration
        const result = await Configuration.findOneAndDelete({
            characterId: characterId || null,
            corporationId: corporationId || null,
            allianceId: allianceId || null,
            all: all || false,
            key,
        });

        if (!result) {
            throw createError({
                statusCode: 404,
                statusMessage: "Configuration not found",
            });
        }

        return {
            success: true,
        };
    } catch (error: any) {
        if (error.statusCode) {
            throw error;
        }

        throw createError({
            statusCode: 500,
            statusMessage: "Failed to delete configuration",
        });
    }
});
