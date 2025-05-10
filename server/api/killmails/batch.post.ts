import { createError, defineEventHandler, readBody } from 'h3';
import type { IKillmail } from '~/server/interfaces/IKillmail';
import { Killmails } from '~/server/models/Killmails';

export default defineEventHandler(async (event) => {
    const body = await readBody(event);
    const { ids } = body;

    if (!Array.isArray(ids) || ids.some(isNaN)) {
        throw createError({
            statusCode: 400,
            statusMessage: 'Invalid request body. Expected an array of killmail IDs.',
        });
    }

    try {
        const killmails: IKillmail[] = await Killmails.find({
            killmail_id: { $in: ids },
        }).lean();

        // It's good practice to return killmails in the order of the requested IDs,
        // although for this use case it might not be strictly necessary.
        // If order is important, you'd need to sort the results based on the input `ids` array.
        // For now, returning as is from the database query is simpler and likely sufficient.

        return killmails;

    } catch (error: any) {
        console.error('Error fetching killmails by batch ID:', error);
        throw createError({
            statusCode: 500,
            statusMessage: 'Error fetching killmails.',
            cause: error,
        });
    }
});
