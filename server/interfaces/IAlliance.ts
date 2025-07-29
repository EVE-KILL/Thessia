export interface IAlliance {
    alliance_id: number;
    name: string;
    ticker: string;
    creator_id: number;
    creator_corporation_id: number;
    executor_corporation_id: number;
    date_founded: Date;
    faction_id?: number;
    faction_name?: string;
    corporation_count?: number;
    member_count?: number;
    updatedAt?: Date;
    createdAt?: Date;
}
