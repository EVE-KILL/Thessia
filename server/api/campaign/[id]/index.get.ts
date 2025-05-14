import { createError, defineEventHandler, getRouterParam } from 'h3';
import { processQueryForUI } from '~/server/helpers/CampaignsHelper';
import { Campaigns } from '~/server/models/Campaigns';

export default defineEventHandler(async (event) => {
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
});
