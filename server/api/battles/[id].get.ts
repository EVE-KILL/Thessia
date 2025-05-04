import { createError, defineEventHandler, getRouterParam } from 'h3';
import { Battles } from '~/server/models/Battles';
import { Regions } from '~/server/models/Regions';
import { SolarSystems } from '~/server/models/SolarSystems';

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
        const battle = await Battles.findOne({ battle_id: battleId }).lean();

        if (!battle) {
            throw createError({ statusCode: 404, statusMessage: 'Battle not found' });
        }

        let systemData = await SolarSystems.findOne({ system_id: battle.system_id }, { _id: 0, system_name: 1, region_id: 1, security: 1 });
        let regionData = await Regions.findOne({ region_id: systemData?.region_id }, { _id: 0, name: 1 });

        battle.system_name = systemData?.system_name || 'Unknown System';
        battle.system_security = systemData?.security ?? null;
        battle.region_id = systemData?.region_id ?? null;
        battle.region_name = regionData?.name ?? null;

        return battle;
    } catch (error: any) {
        if (error.name === 'CastError') {
            throw createError({ statusCode: 400, statusMessage: 'Invalid Battle ID format' });
        }
        if (error.statusCode === 404) {
            throw error;
        }
        console.error(`Error fetching battle with ID ${battleId}:`, error);
        throw createError({ statusCode: 500, statusMessage: 'Internal Server Error fetching battle' });
    }
});
