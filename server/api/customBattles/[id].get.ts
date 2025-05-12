import { createError, defineEventHandler, getRouterParam } from 'h3';
import { CustomBattles } from '~/server/models/CustomBattles';

export default defineEventHandler(async (event) => {
    const idParam = getRouterParam(event, 'id');

    if (!idParam) {
        throw createError({ statusCode: 400, statusMessage: 'Battle ID parameter is missing' });
    }

    const battleId = parseInt(idParam, 10);

    if (isNaN(battleId)) {
        throw createError({ statusCode: 400, statusMessage: 'Invalid Battle ID format' });
    }

    try {
        const battle = await CustomBattles.findOne({ battle_id: battleId }).lean();

        if (!battle) {
            throw createError({ statusCode: 404, statusMessage: 'Custom battle not found' });
        }

        // Transform any Date objects to ISO strings for JSON serialization
        return battle;
    } catch (error: any) {
        if (error.name === 'CastError') {
            throw createError({ statusCode: 400, statusMessage: 'Invalid Battle ID format' });
        }
        if (error.statusCode === 404) {
            throw error;
        }
        console.error(`Error fetching custom battle with ID ${battleId}:`, error);
        throw createError({ statusCode: 500, statusMessage: 'Internal Server Error fetching custom battle' });
    }
});
