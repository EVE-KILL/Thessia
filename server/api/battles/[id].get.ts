import { createError } from 'h3';
import { Battles } from '~/server/models/Battles';

export default defineCachedEventHandler(async (event) => {
    const idParam = event.context.params?.id;

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
            throw createError({ statusCode: 404, statusMessage: 'battle not found' });
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
        console.error(`Error fetching battle with ID ${battleId}:`, error);
        throw createError({ statusCode: 500, statusMessage: 'Internal Server Error fetching battle' });
    }
}, {
    maxAge: 300,
    staleMaxAge: -1,
    swr: true,
    base: "redis",
    shouldBypassCache: (event) => {
        return process.env.NODE_ENV !== "production";
    },
    getKey: (event) => {
        // Ensure params and id are available
        const battleId = event.context.params?.id;
        if (!battleId) {
            // This case should ideally not happen with route params, but for type safety:
            throw createError({ statusCode: 500, statusMessage: 'Battle ID not found in context' });
        }
        return `battles:${battleId}:index`;
    }
});
