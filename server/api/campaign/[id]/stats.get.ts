export default defineCachedEventHandler(
    async (event: H3Event) => {
        const campaignId = getRouterParam(event, "id");

        if (!campaignId) {
            throw createError({
                statusCode: 400,
                statusMessage: "Campaign ID is required",
            });
        }

        try {
            // First, get the campaign to check processing status
            const campaign = await Campaigns.findOne({
                campaign_id: campaignId,
            }).lean();

            if (!campaign) {
                throw createError({
                    statusCode: 404,
                    statusMessage: "Campaign not found",
                });
            }

            // Check if we have processed data available - prioritize existing data
            // This change ensures the frontend doesn't get stuck waiting for processing
            // when the campaign already has usable data. Background processing can
            // continue via queue/cron without affecting user experience.
            if (
                campaign.processed_data &&
                Object.keys(campaign.processed_data).length > 0
            ) {
                // Return the cached processed data immediately, regardless of processing status
                return campaign.processed_data;
            }

            // No processed data available, check processing status
            const processingStatus = await getCampaignProcessingStatus(
                campaignId
            );

            // If not processing and no processed data, queue it
            if (!processingStatus || processingStatus.status === "pending") {
                await queueCampaignProcessing(campaignId, 5);
            }

            // Return processing status only when there's no processed data
            return {
                processing: true,
                status: processingStatus?.status || "pending",
                started_at: processingStatus?.started_at,
                completed_at: processingStatus?.completed_at,
                error: processingStatus?.error,
                campaign_id: campaignId,
                name: campaign.name,
                description: campaign.description,
                startTime: campaign.startTime,
                endTime: campaign.endTime,
                public: campaign.public,
                campaignQuery: campaign.query,
            };
        } catch (error: any) {
            console.error(
                `Error getting stats for campaign ${campaignId}:`,
                error
            );

            // Forward HTTP errors from the helper function
            if (error.statusCode) {
                throw error;
            }

            // Otherwise, create a generic error
            throw createError({
                statusCode: 500,
                statusMessage: "Error getting campaign statistics",
                message: error.message || "Error getting campaign statistics",
            });
        }
    },
    {
        maxAge: 3600,
        staleMaxAge: -1,
        swr: true,
        getKey: async (event) => {
            // Access the parameter directly and add a check for robustness
            const campaignId = event.context.params?.id;
            const campaignData = await Campaigns.findOne(
                {
                    campaign_id: campaignId,
                },
                {
                    query: 1,
                }
            );

            const query = JSON.stringify(campaignData.query);

            if (!campaignId) {
                console.error(
                    "Campaign ID is missing in getKey for stats endpoint"
                );
                return "campaign:missing-id:stats";
            }

            return `campaign:${campaignId}:stats:${query}`;
        },
    }
);
