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
        // Get current character data
        const currentCharacter = await Characters.findOne({
            character_id: characterId,
        });
        if (!currentCharacter) {
            throw createError({
                statusCode: 404,
                statusMessage: "Character not found",
            });
        }

        // Fetch fresh data from ESI with force update
        const freshData = await getCharacter(characterId, true);
        if (!freshData) {
            throw createError({
                statusCode: 500,
                statusMessage: "Failed to fetch data from ESI",
            });
        }

        // Compare and check for changes
        const changes: string[] = [];
        const fieldsToCompare = [
            "name",
            "corporation_id",
            "alliance_id",
            "faction_id",
            "security_status",
        ];

        for (const field of fieldsToCompare) {
            const currentValue = (currentCharacter as any)[field];
            const freshValue = (freshData as any)[field];
            if (currentValue !== freshValue) {
                changes.push(field);
            }
        }

        let updated = false;
        if (changes.length > 0) {
            // Update with fresh data
            await Characters.updateOne(
                { character_id: characterId },
                {
                    $set: {
                        ...freshData,
                        updatedAt: new Date(),
                    },
                }
            );
            updated = true;
        }

        return {
            success: true,
            updated,
            changes,
            message: updated
                ? `Character updated with ${
                      changes.length
                  } changes: ${changes.join(", ")}`
                : "Character is already up to date",
        };
    } catch (error) {
        console.error("Error refreshing character:", error);
        throw createError({
            statusCode: 500,
            statusMessage: "Failed to refresh character data",
        });
    }
});
