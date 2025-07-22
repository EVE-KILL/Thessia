import { createError, defineEventHandler, getRouterParam } from 'h3';
import { getCampaignProcessingStatus } from '~/server/queue/Campaign';

export default defineEventHandler(async (event) => {
    const campaignId = getRouterParam(event, 'id');

    if (!campaignId) {
        throw createError({
            statusCode: 400,
            statusMessage: 'Campaign ID is required',
        });
    }

    try {
        const status = await getCampaignProcessingStatus(campaignId);
        
        if (!status) {
            throw createError({
                statusCode: 404,
                statusMessage: 'Campaign not found',
            });
        }

        return status;
    } catch (error: any) {
        console.error(`Error getting processing status for campaign ${campaignId}:`, error);

        // Forward HTTP errors
        if (error.statusCode) {
            throw error;
        }

        // Otherwise, create a generic error
        throw createError({
            statusCode: 500,
            statusMessage: 'Error getting campaign processing status',
            message: error.message || 'Error getting campaign processing status',
        });
    }
});
