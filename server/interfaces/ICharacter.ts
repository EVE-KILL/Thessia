export interface ICharacterHistory {
    record_id: number;
    corporation_id: number;
    start_date: Date;
}

// Interface for a Character
export interface ICharacter {
    character_id: number;
    name: string;
    description: string;
    birthday: Date;
    gender: string;
    race_id: number;
    race_name?: string;
    security_status: number;
    bloodline_id: number;
    bloodline_name?: string;
    corporation_id: number;
    corporation_name?: string;
    alliance_id: number;
    alliance_name?: string;
    faction_id: number;
    faction_name?: string;
    title?: string;
    history: ICharacterHistory[];
    deleted?: boolean;
    last_active?: Date;
    updatedAt?: Date;
    createdAt?: Date;
    error?: string;
}
