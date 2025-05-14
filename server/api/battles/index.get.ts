import { createError, getQuery } from 'h3';
import type { PipelineStage } from 'mongoose';
import { Battles } from '~/server/models/Battles';

export default defineCachedEventHandler(async (event) => {
    const query = getQuery(event);
    const page = parseInt(query.page?.toString() || '1', 10);
    const limit = parseInt(query.limit?.toString() || '20', 10);

    if (isNaN(page) || page < 1) {
        throw createError({ statusCode: 400, statusMessage: 'Invalid page number' });
    }
    if (isNaN(limit) || limit < 1 || limit > 100) { // Added upper limit for safety
        throw createError({ statusCode: 400, statusMessage: 'Invalid limit value (must be between 1 and 100)' });
    }

    const skip = (page - 1) * limit;

    try {
        // Use aggregation pipeline to populate system and region info
        const aggregationPipeline: PipelineStage[] = [
            // Match can be added here if needed for filtering
            { $sort: { start_time: -1 } }, // Sort before skip/limit for correct pagination
            { $skip: skip },
            { $limit: limit },
            // Project the desired fields
            {
                $project: {
                    _id: 0, // Exclude the default _id
                }
            }
        ];

        // Execute aggregation for data and count in parallel
        const [results, totalItemsResult] = await Promise.all([
            Battles.aggregate(aggregationPipeline),
            Battles.countDocuments() // Get total count for pagination
        ]);

        const battles = results;
        const totalItems = totalItemsResult;
        const totalPages = Math.ceil(totalItems / limit);

        return {
            totalItems,
            totalPages,
            currentPage: page,
            itemsPerPage: limit,
            battles,
        };
    } catch (error) {
        console.error('Error fetching battles:', error);
        throw createError({ statusCode: 500, statusMessage: 'Internal Server Error fetching battles' });
    }
}, {
    maxAge: 3600,
    staleMaxAge: -1,
    swr: true,
    base: "redis",
    getKey: async () => {
        return 'battle-count' + await Battles.estimatedDocumentCount();
    }
});
