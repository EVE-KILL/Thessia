export default defineEventHandler(async (event) => {
    const campaignId = getRouterParam(event, "id");

    if (!campaignId) {
        throw createError({
            statusCode: 400,
            statusMessage: "Campaign ID is required",
        });
    }

    try {
        // Check if campaign exists
        const campaign = await Campaigns.findOne({
            campaign_id: campaignId,
        }).lean();

        if (!campaign) {
            throw createError({
                statusCode: 404,
                statusMessage: "Campaign not found",
            });
        }

        // Queue the campaign for reprocessing
        await reprocessCampaign(campaignId, 15); // High priority for manual retries

        return {
            success: true,
            message: "Campaign queued for reprocessing",
            campaign_id: campaignId,
        };
    } catch (error: any) {
        console.error(
            `Error queuing campaign ${campaignId} for reprocessing:`,
            error
        );

        // Forward HTTP errors
        if (error.statusCode) {
            throw error;
        }

        // Otherwise, create a generic error
        throw createError({
            statusCode: 500,
            statusMessage: "Error queuing campaign for reprocessing",
            message: error.message || "Error queuing campaign for reprocessing",
        });
    }
});
