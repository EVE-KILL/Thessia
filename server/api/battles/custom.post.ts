export default defineEventHandler(async (event) => {
    try {
        const battleDocument = await readBody(event);

        // Validate if battleDocument is received
        if (
            !battleDocument ||
            typeof battleDocument !== "object" ||
            !battleDocument.battle_id
        ) {
            throw createError({
                statusCode: 400,
                statusMessage:
                    "apiErrors.customBattles.custom.invalidBattleData",
            });
        }

        // Ensure this is marked as a custom battle
        // This should ideally be set by compileFullBattleData in preview.post.ts
        // but we ensure it here as well.
        battleDocument.custom = true;

        // Save the battle in the database
        const savedBattle = await Battles.create(battleDocument);

        // Return the battle_id
        return {
            battle_id: savedBattle.battle_id,
            message: "Custom battle created successfully",
        };
    } catch (error: any) {
        console.error("Error in customBattles/custom.post.ts endpoint:", error);
        // If it's a known error (like validation), use its statusCode
        if (error.statusCode) {
            throw error;
        }
        // For database errors or other unexpected errors
        let statusMessageKey =
            "apiErrors.customBattles.custom.internalServerError";
        // The detailed error message is logged for the server admin,
        // the user will see a generic translated error message.
        // If a more specific key for database errors was desired for the frontend,
        // it could be set here. For now, all 500s from this block use internalServerError.
        if (error.name === "MongoServerError") {
            // Still using a generic key for the user, but logging details.
            console.error(
                "Database operation failed (MongoServerError):",
                error
            );
        }
        throw createError({
            statusCode: 500,
            statusMessage: statusMessageKey,
        });
    }
});

// Removed prepareTeamsData function as it's no longer needed
