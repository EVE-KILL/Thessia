import { cliLogger } from "~/server/helpers/Logger";
import { Campaigns } from "~/server/models/Campaigns";
import { queueCampaignProcessing } from "~/server/queue/Campaign";

export default {
    name: "campaignUpdater",
    description: "Updates campaign statistics - hourly for active campaigns, daily for completed ones",
    schedule: "0 * * * *", // Run every hour
    run: async () => {
        const now = new Date();
        cliLogger.info(`🔄 Starting campaign update process at ${now.toISOString()}`);

        try {
            // Get all campaigns that need updating
            const campaignsToUpdate = await getCampaignsNeedingUpdate(now);
            
            if (campaignsToUpdate.length === 0) {
                cliLogger.info("ℹ️  No campaigns need updating at this time");
                return;
            }

            cliLogger.info(`📊 Found ${campaignsToUpdate.length} campaigns that need updating`);

            // Queue campaigns for processing
            let queuedCount = 0;
            for (const campaign of campaignsToUpdate) {
                try {
                    await queueCampaignProcessing(campaign.campaign_id, getPriority(campaign, now));
                    queuedCount++;
                    cliLogger.info(`✅ Queued campaign ${campaign.campaign_id} (${campaign.name}) for processing`);
                } catch (error: any) {
                    cliLogger.error(`❌ Failed to queue campaign ${campaign.campaign_id}: ${error?.message || 'Unknown error'}`);
                }
            }

            cliLogger.info(`🚀 Successfully queued ${queuedCount}/${campaignsToUpdate.length} campaigns for processing`);
        } catch (error: any) {
            cliLogger.error(`💥 Campaign updater failed: ${error?.message || 'Unknown error'}`);
        }
    },
};

/**
 * Get campaigns that need updating based on their status and timing rules
 */
async function getCampaignsNeedingUpdate(now: Date) {
    const campaigns = await Campaigns.find({
        public: true // Only process public campaigns
    }, {
        campaign_id: 1,
        name: 1,
        startTime: 1,
        endTime: 1,
        processing_status: 1,
        processing_completed_at: 1,
        last_processed_at: 1,
        createdAt: 1
    }).lean();

    const campaignsNeedingUpdate = [];

    for (const campaign of campaigns) {
        if (shouldUpdateCampaign(campaign, now)) {
            campaignsNeedingUpdate.push(campaign);
        }
    }

    return campaignsNeedingUpdate;
}

/**
 * Determine if a campaign should be updated based on timing rules
 */
function shouldUpdateCampaign(campaign: any, now: Date): boolean {
    const startTime = new Date(campaign.startTime);
    const endTime = campaign.endTime ? new Date(campaign.endTime) : null;
    const lastProcessed = campaign.last_processed_at ? new Date(campaign.last_processed_at) : null;
    const processingCompleted = campaign.processing_completed_at ? new Date(campaign.processing_completed_at) : null;

    // Never processed or failed processing - always update
    if (!campaign.processing_status || campaign.processing_status === 'failed' || campaign.processing_status === 'pending') {
        return true;
    }

    // Currently processing - skip
    if (campaign.processing_status === 'processing') {
        return false;
    }

    // Never been successfully processed - update
    if (!lastProcessed || !processingCompleted) {
        return true;
    }

    // Determine campaign phase
    const campaignPhase = getCampaignPhase(startTime, endTime, now);
    const timeSinceLastUpdate = now.getTime() - lastProcessed.getTime();
    const hourInMs = 60 * 60 * 1000;
    const dayInMs = 24 * hourInMs;
    const weekInMs = 7 * dayInMs;

    switch (campaignPhase) {
        case 'future':
            // Campaign hasn't started yet - update once daily to prepare
            return timeSinceLastUpdate >= dayInMs;

        case 'active':
            // Campaign is ongoing - update every hour
            return timeSinceLastUpdate >= hourInMs;

        case 'recently_ended':
            // Campaign ended within the last week - update daily
            return timeSinceLastUpdate >= dayInMs;

        case 'old':
            // Campaign ended more than a week ago - stop updating
            return false;

        default:
            return false;
    }
}

/**
 * Determine the current phase of a campaign
 */
function getCampaignPhase(startTime: Date, endTime: Date | null, now: Date): 'future' | 'active' | 'recently_ended' | 'old' {
    const weekInMs = 7 * 24 * 60 * 60 * 1000;

    // Campaign hasn't started yet
    if (now < startTime) {
        return 'future';
    }

    // Campaign has an end time
    if (endTime) {
        if (now <= endTime) {
            return 'active';
        } else {
            // Campaign has ended
            const timeSinceEnd = now.getTime() - endTime.getTime();
            return timeSinceEnd <= weekInMs ? 'recently_ended' : 'old';
        }
    }

    // No end time specified - campaign is ongoing
    return 'active';
}

/**
 * Get processing priority based on campaign phase and urgency
 */
function getPriority(campaign: any, now: Date): number {
    const startTime = new Date(campaign.startTime);
    const endTime = campaign.endTime ? new Date(campaign.endTime) : null;
    const phase = getCampaignPhase(startTime, endTime, now);

    // Higher numbers = higher priority in BullMQ
    switch (phase) {
        case 'active':
            return 10; // Highest priority for active campaigns

        case 'recently_ended':
            return 5; // Medium priority for recently ended

        case 'future':
            return 2; // Low priority for future campaigns

        case 'old':
        default:
            return 1; // Lowest priority (shouldn't happen as we filter these out)
    }
}
