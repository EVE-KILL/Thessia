import { createError, getRouterParam } from 'h3';
import { generateCampaignStats } from '~/server/helpers/CampaignsHelper';

import { H3Event } from 'h3';

export default defineCachedEventHandler(async (event: H3Event) => {
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
    base: "redis",
    shouldBypassCache: (event) => {
        return process.env.NODE_ENV !== "production";
    },
    getKey: async (event) => {
        // Access the parameter directly and add a check for robustness
        const campaignId = event.context.params?.id;
        const campaignData = await Campaigns.findOne({
            campaign_id: campaignId,
        }, {
            query: 1
        });

        const query = JSON.stringify(campaignData.query);

        if (!campaignId) {
            console.error('Campaign ID is missing in getKey for stats endpoint');
            return 'campaign:missing-id:stats';
        }

        return `campaign:${campaignId}:stats:${query}`;
    }
});
