import type { H3Event } from 'h3';
import { sendError } from 'h3';
import { getCorporationTopStats } from '~/server/helpers/Stats';

export default defineEventHandler(async (event: H3Event) => {
    const { id } = event.context.params as { id: string };
    if (!id) {
        return sendError(event, createError({ statusCode: 400, statusMessage: 'Missing corporation id' }));
    }

    try {
        const stats = await getCorporationTopStats(Number(id));
        return stats;
    } catch (error) {
        return sendError(event, createError({ statusCode: 500, statusMessage: 'Failed to fetch corporation top stats' }));
    }
});
