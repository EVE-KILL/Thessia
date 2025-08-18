export default defineCachedEventHandler(
    async (event) => {
        const campaignId = getRouterParam(event, "id");

        if (!campaignId) {
            throw createError({
                statusCode: 400,
                statusMessage: "Campaign ID is required",
            });
        }

        try {
            // Find the campaign
            const campaign = await Campaigns.findOne({
                campaign_id: campaignId,
            }).lean();

            if (!campaign) {
                throw createError({
                    statusCode: 404,
                    statusMessage: "Campaign not found",
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
                filterEntities,
                // Include processing status information
                processing_status: campaign.processing_status || "pending",
                processing_started_at: campaign.processing_started_at,
                processing_completed_at: campaign.processing_completed_at,
                processing_error: campaign.processing_error,
                last_processed_at: campaign.last_processed_at,
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
                statusMessage: "Error fetching campaign",
                message: error.message || "Error fetching campaign",
            });
        }
    },
    {
        maxAge: 3600,
        staleMaxAge: -1,
        swr: true,
        shouldBypassCache: async (event) => {
            // Always bypass cache in non-production
            if (process.env.NODE_ENV !== "production") {
                return true;
            }

            // Bypass cache for campaigns that are currently processing
            const campaignId = getRouterParam(event, "id");
            if (campaignId) {
                try {
                    const campaign = await Campaigns.findOne(
                        { campaign_id: campaignId },
                        { processing_status: 1 }
                    ).lean();

                    // Don't cache if campaign is pending or processing
                    if (
                        campaign?.processing_status === "pending" ||
                        campaign?.processing_status === "processing"
                    ) {
                        return true;
                    }
                } catch (error) {
                    // If there's an error checking status, bypass cache to be safe
                    console.warn(
                        `Error checking campaign processing status for cache bypass:`,
                        error
                    );
                    return true;
                }
            }

            return false;
        },
        getKey: (event: any) => {
            // Explicitly type event
            const campaignId = getRouterParam(event, "id");
            return `campaign:${campaignId}:index`;
        },
    }
);
