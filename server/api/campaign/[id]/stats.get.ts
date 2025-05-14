import { createError, getRouterParam } from 'h3';
import { generateCampaignStats } from '~/server/helpers/CampaignsHelper';

export default defineCachedEventHandler(async (event) => {
    const campaignId = getRouterParam(event, 'id');

    if (!campaignId) {
        throw createError({
            statusCode: 400,
            statusMessage: 'Campaign ID is required',
        });
    }

    try {
        // Pass only the campaign ID to the helper function which will fetch the campaign data
        const stats = await generateCampaignStats(campaignId);
        return stats;
    } catch (error: any) {
        console.error(`Error generating stats for campaign ${campaignId}:`, error);

        // Forward HTTP errors from the helper function
        if (error.statusCode) {
            throw error;
        }

        // Otherwise, create a generic error
        throw createError({
            statusCode: 500,
            statusMessage: 'Error generating campaign statistics',
            message: error.message || 'Error generating campaign statistics',
        });
    }
}, {
    maxAge: 3600,
    staleMaxAge: -1,
    swr: true,
    base: "redis"
});
