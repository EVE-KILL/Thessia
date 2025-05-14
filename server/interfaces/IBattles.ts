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

// Helper interface for entity statistics (alliances, corporations, characters)
export interface IEntityStats {
    id: number;
    name: string;
    alliance_id?: number; // Optional, e.g., for characters or corps not in an alliance
    alliance_name?: string; // Optional
    kills: number;
    losses: number;
    valueInflicted: number;
    valueSuffered: number;
}

// Helper interface for team summary statistics
export interface ITeamSummaryStats {
    iskLost: number;
    shipsLost: number;
    damageInflicted: number; // Total damage dealt by this team
}

// Helper interface for entity items (e.g., in team definitions)
export interface IEntityItem {
    id: number;
    name?: string;
}

// Helper interface for system information (multiple systems can be involved)
export interface ISystemInfo {
    system_id: number;
    system_name: string; // Name is typically string from SDE
    system_security: number;
    region_id: number;
    region_name: ITranslation | string; // Name can be ITranslation or string
}

// Helper interface for data specific to a side/team in a battle
export interface ISideData {
    id: string; // e.g., "blue", "red", or a generated ID
    name: string; // Team name, e.g., "Team A"
    alliances: IEntityItem[];
    corporations: IEntityItem[];
    kill_ids: number[]; // Killmails attributed to this side's victims or inflicted by this side
    stats: ITeamSummaryStats;
    alliances_stats: IEntityStats[];
    corporations_stats: IEntityStats[];
    characters_stats: IEntityStats[];
    ship_manifest: ICharacterShipManifestEntry[]; // Ships involved for this side
}

// Helper interface for top entities (alliances, corporations, ship types)
export interface ITopEntity {
    id: number;
    name: string | ITranslation; // Name can be string or ITranslation (e.g., for ship types)
    count: number;
}

// Main interface for Custom Battles, reflecting the structure from compileFullBattleData
export interface IBattles {
    battle_id: number;
    custom?: boolean; // Indicates if the battle was manually created/defined
    start_time: Date;
    end_time: Date;
    duration_ms?: number;

    systems?: ISystemInfo[]; // Array of systems involved in the battle

    killmailsCount: number;
    iskDestroyed: number; // Total ISK value of ships destroyed

    // Arrays of IDs for all involved entities across all sides
    alliancesInvolved: number[];
    corporationsInvolved: number[];
    charactersInvolved: number[];

    // Counts of unique involved entities
    involved_alliances_count?: number;
    involved_corporations_count?: number;
    involved_characters_count?: number;

    // Top entities involved in the battle
    top_alliances?: Array<{
        id: number;
        name: string; // Alliance names are typically strings
        count: number; // e.g., number of members involved or killmails
    }>;
    top_corporations?: Array<{
        id: number;
        name: string; // Corporation names are typically strings
        count: number;
    }>;
    top_ship_types?: ITopEntity[]; // Ship types, name can be ITranslation

    killmail_ids?: number[]; // All killmail IDs included in this battle

    // Defines the participating sides and their specific data
    side_ids?: string[]; // Array of keys used in the 'sides' object (e.g., ["blue", "red"])
    sides?: Record<string, ISideData>; // Object mapping side ID to detailed side data

    // Timestamps automatically managed by Mongoose
    updatedAt?: Date;
    createdAt?: Date;
}
