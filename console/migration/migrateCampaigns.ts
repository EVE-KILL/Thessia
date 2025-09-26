import prisma from "../../lib/prisma";
import { cliLogger } from "../../server/helpers/Logger";
import { Campaigns } from "../../server/models/Campaigns";

export async function migrateCampaigns() {
    cliLogger.info("Starting Campaign migration from MongoDB to PostgreSQL");

    const campaigns = await Campaigns.find().lean();
    const totalCampaigns = campaigns.length;

    cliLogger.info(`Total campaigns to migrate: ${totalCampaigns}`);

    let migratedCount = 0;
    let errorCount = 0;

    for (const campaign of campaigns) {
        try {
            const {
                _id,
                __v,
                createdAt,
                updatedAt,
                startTime,
                endTime,
                "processing-status": processingStatusWithHyphen,
                processing_status,
                ...rest
            } = campaign as any;

            // Handle the processing_status field (could be hyphenated or underscored)
            const finalProcessingStatus =
                processing_status || processingStatusWithHyphen || "pending";

            const data: any = {
                campaign_id: rest.campaign_id,
                name: rest.name,
                description: rest.description || null,
                start_time: startTime,
                end_time: endTime || null,
                query: rest.query || {},
                creator_id: rest.creator_id || null,
                public: rest.public !== undefined ? rest.public : true,
                processing_status: finalProcessingStatus,
                processing_started_at: rest.processing_started_at || null,
                processing_completed_at: rest.processing_completed_at || null,
                processing_error: rest.processing_error || null,
                last_processed_at: rest.last_processed_at || null,
                processed_data: rest.processed_data || null,
                created_at: createdAt,
                updated_at: updatedAt,
            };

            await prisma.campaign.create({
                data,
            });

            migratedCount++;
        } catch (error) {
            errorCount++;
            cliLogger.error(
                `Error migrating campaign ${campaign._id}: ${error}`
            );
        }
    }

    cliLogger.info(
        `✅ Campaign migration completed. Migrated: ${migratedCount}, Errors: ${errorCount}`
    );
}
