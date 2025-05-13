export interface IHistoricalStats {
    alliance_id: number;
    corporation_id: number;
    count: number;
    previousCount?: number;
    date: Date;
    sum_sec_status?: number;
    avg_sec_status?: number;  // Added average security status
    pirate_members?: number;
    carebear_members?: number;
    neutral_members?: number;
    // Add pre-calculated change fields
    change_1d?: number | null;
    change_7d?: number | null;
    change_14d?: number | null;
    change_30d?: number | null;
    historicalCounts: Array<{
        count: number;
        date: Date;
    }>;
    updatedAt?: Date;
    createdAt?: Date;
}
