export default defineEventHandler(async (event) => {
    // Admin authentication check
    const cookie = getCookie(event, "evelogin");
    if (!cookie) {
        throw createError({
            statusCode: 401,
            statusMessage: "Authentication required",
        });
    }

    const user = await Users.findOne({ uniqueIdentifier: cookie });
    if (!(user as any)?.administrator) {
        throw createError({
            statusCode: 403,
            statusMessage: "Administrator privileges required",
        });
    }

    const characterId = parseInt(getRouterParam(event, "id") || "0");
    if (!characterId) {
        throw createError({
            statusCode: 400,
            statusMessage: "Invalid character ID",
        });
    }

    try {
        // Check if character exists
        const character = await Characters.findOne({
            character_id: characterId,
        });
        if (!character) {
            throw createError({
                statusCode: 404,
                statusMessage: "Character not found",
            });
        }

        // Soft delete by setting deleted field
        const result = await Characters.updateOne(
            { character_id: characterId },
            {
                $set: {
                    deleted: new Date(),
                    updatedAt: new Date(),
                },
            }
        );

        if (result.matchedCount === 0) {
            throw createError({
                statusCode: 404,
                statusMessage: "Character not found",
            });
        }

        return {
            success: true,
            message: `Character ${(character as any).name} has been deleted`,
            characterId: characterId,
        };
    } catch (error: any) {
        console.error("Error deleting character:", error);

        if (error.statusCode) {
            throw error;
        }

        throw createError({
            statusCode: 500,
            statusMessage: "Failed to delete character",
        });
    }
});
