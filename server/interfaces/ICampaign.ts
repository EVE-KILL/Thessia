export interface ICampaign {
    campaign_id: string; // Unique identifier for the campaign
    name: string; // Name of the campaign
    description?: string; // Optional description
    startTime: Date; // Start time for the campaign
    endTime?: Date; // Optional end time
    query: Record<string, any>; // MongoDB query object
    creator_id?: number; // Optional user ID of creator (for future auth)
    public: boolean; // Whether campaign is publicly visible
    createdAt?: Date; // Creation timestamp
    updatedAt?: Date; // Last update timestamp
}
