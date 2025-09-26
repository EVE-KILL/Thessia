import prisma from "../../lib/prisma";
import { Campaigns } from "../../server/models/Campaigns";
import { ValidationHelper } from "./ValidationHelper";

export async function validateCampaigns() {
    await ValidationHelper.validateMigration(
        Campaigns,
        prisma.campaign,
        "campaign_id",
        {
            sampleSize: 10,
            fieldsToCompare: [
                "name",
                "description",
                "start_time",
                "end_time",
                "creator_id",
                "public",
                "processing_status",
                "processing_error",
            ],
            dateFields: [
                { field: "start_time" },
                { field: "end_time" },
                { field: "processing_started_at" },
                { field: "processing_completed_at" },
                { field: "last_processed_at" },
                { field: "created_at" },
                { field: "updated_at" },
            ],
        }
    );
}
