import type { ITranslation } from "./ITranslation";

// Ship manifest entry for character tracking in battles
export interface ICharacterShipManifestEntry {
    character_id?: number;
    character_name?: string;
    corporation_id?: number;
    corporation_name?: string;
    alliance_id?: number;
    alliance_name?: string;
    ship_type_id: number; // Ship type ID
    ship_name: ITranslation | string;
    ship_group_id?: number;
    ship_group_name?: ITranslation | string;
    was_lost: boolean; // True if this specific ship instance was a victim
    killmail_id_if_lost?: number; // The killmail_id where this ship was lost
    damage_taken?: number;
    damage_dealt?: number;
}

// New helper interfaces
export interface IEntityStats {
    id: number;
    name: string;
    alliance_id?: number;
    alliance_name?: string;
    kills: number;
    losses: number;
    valueInflicted: number;
    valueSuffered: number;
}

export interface ITeamSummaryStats {
    iskLost: number;
    shipsLost: number;
    damageInflicted: number;
}

export interface IEntityItem {
    id: number;
    name?: string;
}

export interface ISystemInfo {
    system_id: number;
    system_name: string;
    system_security: number;
    region_id: number;
    region_name: Record<string, string> | ITranslation;
}

export interface ISideData {
    id: string;
    name: string;
    alliances: IEntityItem[];
    corporations: IEntityItem[];
    kill_ids: number[];
    stats: ITeamSummaryStats;
    alliances_stats: IEntityStats[];
    corporations_stats: IEntityStats[];
    characters_stats: IEntityStats[];
    ship_manifest: ICharacterShipManifestEntry[];
}

export interface ITopEntity {
    id: number;
    name: string | Record<string, string>;
    count: number;
}

// Main IBattles interface modification
export interface IBattles {
    battle_id: number;
    custom?: boolean;
    start_time: Date;
    end_time: Date;
    duration_ms?: number;
    system_id: number;
    system_name?: string;
    region_id: number;
    region_name?: Record<string, string> | ITranslation;
    system_security?: number;
    killmailsCount: number;
    iskDestroyed: number;
    alliancesInvolved: number[];
    corporationsInvolved: number[];
    charactersInvolved: number[];
    involved_alliances_count?: number;
    involved_corporations_count?: number;
    involved_characters_count?: number;
    top_alliances?: Array<{
        id: number;
        name: string;
        count: number;
    }>;
    top_corporations?: Array<{
        id: number;
        name: string;
        count: number;
    }>;
    top_ship_types?: Array<{
        id: number;
        name: Record<string, string> | ITranslation;
        count: number;
    }>;

    // Existing team definitions (identifying members)
    blue_team: {
        alliances: Array<{ id: number; name: string; }>;
        corporations: Array<{ id: number; name: string; }>;
    };
    red_team: {
        alliances: Array<{ id: number; name: string; }>;
        corporations: Array<{ id: number; name: string; }>;
    };

    // New fields for detailed data
    killmail_ids?: number[]; // For the timeline, changed from killmails

    blue_team_kill_ids?: number[]; // Changed from blue_team_kills
    red_team_kill_ids?: number[];   // Changed from red_team_kills

    blue_team_stats?: ITeamSummaryStats;
    red_team_stats?: ITeamSummaryStats;

    blue_team_alliances_stats?: IEntityStats[];
    red_team_alliances_stats?: IEntityStats[];
    blue_team_corporations_stats?: IEntityStats[];
    red_team_corporations_stats?: IEntityStats[];
    blue_team_characters_stats?: IEntityStats[];
    red_team_characters_stats?: IEntityStats[];

    updatedAt?: Date;
    createdAt?: Date;

    // Ship manifest tracking
    blue_team_ship_manifest?: ICharacterShipManifestEntry[];
    red_team_ship_manifest?: ICharacterShipManifestEntry[];
}
