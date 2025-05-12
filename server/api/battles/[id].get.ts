import { createError, defineEventHandler, getRouterParam } from 'h3';
import { CustomBattles } from '~/server/models/CustomBattles';

export default defineEventHandler(async (event) => {
    const idParam = getRouterParam(event, 'id');

    if (!idParam) {
        throw createError({ statusCode: 400, statusMessage: 'Battle ID parameter is missing' });
    }

    const battleId = parseInt(idParam, 10);
    const battle = await CustomBattles.findOne({ battle_id: battleId }).lean();

    if (!battle) {
        throw createError({ statusCode: 404, statusMessage: 'Battle not found' });
    }

    return battle;
});
