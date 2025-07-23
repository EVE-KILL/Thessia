import { generateCampaignStats } from "../helpers/CampaignsHelper";
import { createQueue } from "../helpers/Queue";

const campaignQueue = createQueue("achievement");

async function queueAchivementProcessing(characterId: string, priority = 1) {
    await campaignQueue.add(
        "achievement",
        { characterId: characterId },
        {
            priority: priority,
            attempts: 3,
            backoff: {
                type: "exponential",
                delay: 5000, // 5 seconds
            },
            removeOnComplete: 10,
            removeOnFail: 25,
        }
    );
}

async function processAchivement(characterId: string) {
    try {
        // Update campaign status to processing
        await Campaigns.updateOne(
            { characterId: characterId },
            {
                processing_status: "processing",
                processing_started_at: new Date(),
            }
        );

        // Generate the campaign stats (this is the heavy operation)
        const campaignStats = await generateCampaignStats(campaignId);

        // Store the processed data in the campaign document
        await Campaigns.updateOne(
            { campaign_id: campaignId },
            {
                processed_data: campaignStats,
                processing_status: "completed",
                processing_completed_at: new Date(),
                last_processed_at: new Date(),
            }
        );

        console.log(`Successfully processed campaign: ${campaignId}`);
    } catch (error: any) {
        console.error(`Failed to process campaign ${campaignId}:`, error);

        // Update campaign status to failed
        await Campaigns.updateOne(
            { campaign_id: campaignId },
            {
                processing_status: "failed",
                processing_error: error.message || "Unknown error",
                processing_completed_at: new Date(),
            }
        );

        // Re-throw the error so the worker can handle it
        throw error;
    }
}

async function getCampaignProcessingStatus(campaignId: string) {
    const campaign = await Campaigns.findOne(
        { campaign_id: campaignId },
        {
            processing_status: 1,
            processing_started_at: 1,
            processing_completed_at: 1,
            processing_error: 1,
            last_processed_at: 1,
        }
    ).lean();

    if (!campaign) {
        return null;
    }

    // Cast to any to access optional fields
    const campaignData = campaign as any;

    return {
        status: campaignData.processing_status || "pending",
        started_at: campaignData.processing_started_at,
        completed_at: campaignData.processing_completed_at,
        error: campaignData.processing_error,
        last_processed_at: campaignData.last_processed_at,
    };
}

async function reprocessCampaign(campaignId: string, priority = 10) {
    // Reset processing status
    await Campaigns.updateOne(
        { campaign_id: campaignId },
        {
            processing_status: "pending",
            processing_error: null,
            processing_started_at: null,
            processing_completed_at: null,
        }
    );

    // Queue for processing with higher priority
    await queueCampaignProcessing(campaignId, priority);
}

export {
    queueCampaignProcessing,
    processCampaign,
    reprocessCampaign,
    getCampaignProcessingStatus,
};
