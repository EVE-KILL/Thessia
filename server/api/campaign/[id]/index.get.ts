import { createError, getRouterParam } from 'h3';
import { processQueryForUI } from '~/server/helpers/CampaignsHelper';
import { Campaigns } from '~/server/models/Campaigns';

export default defineCachedEventHandler(async (event) => {
    const campaignId = getRouterParam(event, 'id');

    if (!campaignId) {
        throw createError({
            statusCode: 400,
            statusMessage: 'Campaign ID is required',
        });
    }

    try {
        // Find the campaign
        const campaign = await Campaigns.findOne({ campaign_id: campaignId }).lean();

        if (!campaign) {
            throw createError({
                statusCode: 404,
                statusMessage: 'Campaign not found',
            });
        }

        // Process filter entities for the UI
        const filterEntities = await processQueryForUI(campaign.query);

        return {
            campaign_id: campaign.campaign_id,
            name: campaign.name,
            description: campaign.description,
            startTime: campaign.startTime,
            endTime: campaign.endTime,
            query: campaign.query,
            creator_id: campaign.creator_id,
            createdAt: campaign.createdAt,
            updatedAt: campaign.updatedAt,
            public: campaign.public,
            campaignQuery: campaign.query,
            filterEntities
        };
    } catch (error: any) {
        console.error(`Error fetching campaign ${campaignId}:`, error);

        // Forward HTTP errors
        if (error.statusCode) {
            throw error;
        }

        // Otherwise, create a generic error
        throw createError({
            statusCode: 500,
            statusMessage: 'Error fetching campaign',
            message: error.message || 'Error fetching campaign',
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
    getKey: (event: any) => { // Explicitly type event
        const campaignId = getRouterParam(event, 'id');
        return `campaign:${campaignId}:index`;
    }
});
