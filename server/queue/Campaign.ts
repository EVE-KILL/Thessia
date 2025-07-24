import { generateCampaignStats } from "../helpers/CampaignsHelper";
import { createQueue } from "../helpers/Queue";
import { Campaigns } from "../models/Campaigns";

const campaignQueue = createQueue("campaign");

async function queueCampaignProcessing(campaignId: string, priority = 1) {
    await campaignQueue.add(
        "campaign",
        { campaignId: campaignId },
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

async function processCampaign(campaignId: string) {
    let campaignStats = null;

    try {
        // Update campaign status to processing
        await Campaigns.updateOne(
            { campaign_id: campaignId },
            {
                processing_status: "processing",
                processing_started_at: new Date(),
            }
        );

        // Generate the campaign stats (this is the heavy operation)
        campaignStats = await generateCampaignStats(campaignId);

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
    } finally {
        // Aggressively clean up memory references
        if (campaignStats) {
            // Clear large arrays and maps from the stats object
            if (campaignStats.killmailIds) {
                campaignStats.killmailIds.length = 0;
                campaignStats.killmailIds = null;
            }
            if (campaignStats.shipGroupStats) {
                campaignStats.shipGroupStats.length = 0;
                campaignStats.shipGroupStats = null;
            }
            if (campaignStats.mostValuableKills) {
                campaignStats.mostValuableKills.length = 0;
                campaignStats.mostValuableKills = null;
            }
            campaignStats = null;
        }

        // Force garbage collection if available
        if (global.gc) {
            global.gc();
        }
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
