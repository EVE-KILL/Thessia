import { createError, defineEventHandler, getQuery } from 'h3';
import type { PipelineStage } from 'mongoose';
import { Battles } from '~/server/models/Battles';

export default defineEventHandler(async (event) => {
    const query = getQuery(event);
    const idParam = event.context.params?.id;
    // The idParam is guaranteed by the route to be digits.
    const systemId = idParam ? parseInt(idParam.toString(), 10) : NaN; 
    if (isNaN(systemId)) {
        // This should not be reached if routing works correctly.
        throw createError({ statusCode: 400, statusMessage: 'Invalid system ID' });
    }

    const page = parseInt(query.page?.toString() || '1', 10);
    const limit = parseInt(query.limit?.toString() || '20', 10);
    if (isNaN(page) || page < 1) {
        throw createError({ statusCode: 400, statusMessage: 'Invalid page number' });
    }
    if (isNaN(limit) || limit < 1 || limit > 100) {
        throw createError({ statusCode: 400, statusMessage: 'Invalid limit value (must be between 1 and 100)' });
    }
    const skip = (page - 1) * limit;

    try {
        const matchStage: PipelineStage = { $match: { system_id: systemId } };
        const pipeline: PipelineStage[] = [
            matchStage,
            { $sort: { start_time: -1 } },
            { $skip: skip },
            { $limit: limit },
            { $project: { _id: 0 } },
        ];

        const [results, totalItems] = await Promise.all([
            Battles.aggregate(pipeline),
            Battles.countDocuments({ system_id: systemId }),
        ]);

        const totalPages = Math.ceil(totalItems / limit);
        return {
            totalItems,
            totalPages,
            currentPage: page,
            itemsPerPage: limit,
            battles: results,
        };
    } catch (error) {
        console.error('Error fetching system battles:', error);
        throw createError({ statusCode: 500, statusMessage: 'Internal Server Error fetching system battles' });
    }
});
