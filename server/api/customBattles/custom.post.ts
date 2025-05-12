import { createError, defineEventHandler, readBody } from 'h3';
import { CustomBattles } from '~/server/models/CustomBattles';
// Removed: import { compileFullBattleData } from '~/server/helpers/CustomBattles';
// Removed: import { Corporations } from '~/server/models/Corporations';
// Removed: import { Killmails } from '~/server/models/Killmails';
// Removed: Side interface as prepareTeamsData is removed

export default defineEventHandler(async (event) => {
    try {
        const battleDocument = await readBody(event);

        // Validate if battleDocument is received
        if (!battleDocument || typeof battleDocument !== 'object' || !battleDocument.battle_id) {
            throw createError({ statusCode: 400, statusMessage: 'Invalid battle data received. battle_id is missing or data is malformed.' });
        }

        // Ensure this is marked as a custom battle
        // This should ideally be set by compileFullBattleData in preview.post.ts
        // but we ensure it here as well.
        battleDocument.custom = true;

        // Save the battle in the database
        const savedBattle = await CustomBattles.create(battleDocument);

        // Return the battle_id
        return {
            battle_id: savedBattle.battle_id,
            message: 'Custom battle created successfully'
        };

    } catch (error: any) {
        console.error('Error in customBattles/custom.post.ts endpoint:', error);
        // If it's a known error (like validation), use its statusCode
        if (error.statusCode) {
            throw error;
        }
        // For database errors or other unexpected errors
        let errorMessage = 'Internal Server Error';
        if (error.name === 'MongoServerError' || error.message?.includes('database')) {
            errorMessage = `Database error: ${error.message || 'Unknown database error'}`;
            // Log more specific db error if available
            console.error('Database operation failed:', error);
        }
        throw createError({
            statusCode: 500,
            statusMessage: errorMessage
        });
    }
});

// Removed prepareTeamsData function as it's no longer needed
