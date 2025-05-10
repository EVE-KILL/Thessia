import type { ITranslation } from "./ITranslation";

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

// Main IBattles interface modification
export interface IBattles {
    battle_id: number;
    start_time: Date;
    end_time: Date;
    duration_ms?: number;
    system_id: number;
    system_name?: string;
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
}
