import prisma from "../../lib/prisma";

export class CampaignService {
    /**
     * Find campaign by campaign_id
     */
    static async findByCampaignId(campaignId: string) {
        return await prisma.campaign.findUnique({
            where: { campaign_id: campaignId },
        });
    }

    /**
     * Find campaign by ID
     */
    static async findById(id: number) {
        return await prisma.campaign.findUnique({
            where: { id },
        });
    }

    /**
     * Create a new campaign
     */
    static async create(campaignData: {
        campaign_id: string;
        name: string;
        description?: string;
        start_time: Date;
        end_time?: Date;
        query: any;
        creator_id?: number;
        public?: boolean;
    }) {
        return await prisma.campaign.create({
            data: campaignData,
        });
    }

    /**
     * Update campaign by campaign_id
     */
    static async updateByCampaignId(campaignId: string, updateData: {
        name?: string;
        description?: string;
        start_time?: Date;
        end_time?: Date;
        query?: any;
        processing_status?: 'pending' | 'processing' | 'completed' | 'failed';
        processing_started_at?: Date;
        processing_completed_at?: Date;
        processing_error?: string;
        last_processed_at?: Date;
        processed_data?: any;
    }) {
        return await prisma.campaign.update({
            where: { campaign_id: campaignId },
            data: updateData,
        });
    }

    /**
     * Delete campaign by campaign_id
     */
    static async deleteByCampaignId(campaignId: string) {
        return await prisma.campaign.delete({
            where: { campaign_id: campaignId },
        });
    }

    /**
     * Find campaigns by creator
     */
    static async findByCreator(creatorId: number) {
        return await prisma.campaign.findMany({
            where: { creator_id: creatorId },
            orderBy: { created_at: "desc" },
        });
    }

    /**
     * Find public campaigns
     */
    static async findPublic(limit?: number) {
        return await prisma.campaign.findMany({
            where: { public: true },
            take: limit,
            orderBy: { created_at: "desc" },
        });
    }

    /**
     * Find campaigns by status
     */
    static async findByStatus(status: 'pending' | 'processing' | 'completed' | 'failed') {
        return await prisma.campaign.findMany({
            where: { processing_status: status },
            orderBy: { created_at: "desc" },
        });
    }
}