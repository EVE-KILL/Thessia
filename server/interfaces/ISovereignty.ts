export interface ISovereigntyHistoryEntry {
    alliance_id?: number;
    alliance_name?: string;
    corporation_id?: number;
    corporation_name?: string;
    faction_id?: number;
    date_added: Date;
}

export interface ISovereignty {
    system_id: number;
    // Current sovereignty data (latest/active)
    alliance_id?: number;
    alliance_name?: string;
    corporation_id?: number;
    corporation_name?: string;
    faction_id?: number;
    date_added: Date;
    // Historical sovereignty changes
    history: ISovereigntyHistoryEntry[];
    updatedAt?: Date;
    createdAt?: Date;
}
