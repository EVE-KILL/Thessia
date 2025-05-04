import { createError, defineEventHandler, getQuery } from 'h3';
import type { PipelineStage } from 'mongoose';
import { Battles } from '~/server/models/Battles';
import { Regions } from '~/server/models/Regions';
import { SolarSystems } from '~/server/models/SolarSystems';

export default defineEventHandler(async (event) => {
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
            // Lookup system information
            {
                $lookup: {
                    from: SolarSystems.collection.name,
                    localField: 'system_id',
                    foreignField: 'system_id',
                    as: 'systemInfo'
                }
            },
            // Unwind the systemInfo array (should only be one match)
            {
                $unwind: {
                    path: '$systemInfo',
                    preserveNullAndEmptyArrays: true // Keep battles even if system lookup fails
                }
            },
            // Lookup region information using region_id from systemInfo
            {
                $lookup: {
                    from: Regions.collection.name,
                    localField: 'systemInfo.region_id',
                    foreignField: 'region_id',
                    as: 'regionInfo'
                }
            },
            // Unwind the regionInfo array
            {
                $unwind: {
                    path: '$regionInfo',
                    preserveNullAndEmptyArrays: true // Keep battles even if region lookup fails
                }
            },
            // Project the desired fields
            {
                $project: {
                    _id: 0, // Exclude the default _id
                    battle_id: 1,
                    start_time: 1,
                    end_time: 1,
                    system_id: 1,
                    killmailsCount: 1,
                    iskDestroyed: 1,
                    alliancesInvolved: 1,
                    corporationsInvolved: 1,
                    charactersInvolved: 1,
                    // Include system and region names, handling potential nulls
                    system_name: { $ifNull: ['$systemInfo.system_name', 'Unknown System'] },
                    system_security: { $ifNull: ['$systemInfo.security', null] },
                    region_id: { $ifNull: ['$systemInfo.region_id', null] },
                    region_name: { $ifNull: ['$regionInfo.name.en', 'Unknown Region'] } // Assuming 'en' name exists
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
});
