export type StatsType = "character_id" | "corporation_id" | "alliance_id";

export interface IStatsBase {
    type: StatsType;
    id: number;
    days: number;
    kills: number;
    losses: number;
    iskKilled: number;
    iskLost: number;
    npcLosses: number;
    soloKills: number;
    soloLosses: number;
    lastActive: Date | null;
}

export interface IMostValuableKill {
    killmail_id: number;
    total_value: number;
    victim: {
        ship_id: number;
        ship_name: string | Record<string, string>;
        character_id?: number;
        character_name?: string;
        corporation_id?: number;
        corporation_name?: string;
        alliance_id?: number;
        alliance_name?: string;
    };
    final_blow?: {
        character_id?: number;
        character_name?: string;
        ship_id: number;
        ship_name: string | Record<string, string>;
    };
}

export interface IMostValuableShip {
    ship_id: number;
    ship_name: string | Record<string, string>;
    total_value: number;
    count: number;
}

export interface IMostValuableStructure {
    structure_id?: number;
    type_id: number;
    type_name: string | Record<string, string>;
    total_value: number;
    count: number;
    system_id?: number;
    system_name?: string;
}

export interface ITopEntity {
    id: number;
    character_id?: number;
    corporation_id?: number;
    alliance_id?: number;
    name: string | Record<string, string>; // Support both string and translation objects
    count: number;
}

export interface IFullStats {
    mostUsedShips: Record<
        string,
        { count: number; name: Record<string, string> }
    >;
    mostLostShips: Record<
        string,
        { count: number; name: Record<string, string> }
    >;
    mostValuableKills: IMostValuableKill[];
    mostValuableShips: IMostValuableShip[];
    mostValuableStructures: IMostValuableStructure[];
    topCharacters: ITopEntity[];
    topCorporations: ITopEntity[];
    topShips: ITopEntity[];
    topSystems: ITopEntity[];
    topConstellations: ITopEntity[];
    topRegions: ITopEntity[];
    shipGroupStats: Array<{
        groupName: string;
        kills: number;
        losses: number;
        efficiency: number;
    }>;
    monthlyStats: Array<{
        year: number;
        month: number;
        monthLabel: string;
        kills: number;
        iskKilled: number;
        losses: number;
        iskLost: number;
        efficiency: number;
    }>;
    diesToCorporations: Record<string, { count: number; name: string }>;
    diesToAlliances: Record<string, { count: number; name: string }>;
    blobFactor: number;
    heatMap: Record<string, number>;
    fliesWithCorporations: Record<string, { count: number; name: string }>;
    fliesWithAlliances: Record<string, { count: number; name: string }>;
    sameShipAsOtherAttackers: number;
    possibleFC: boolean;
    possibleCynoAlt: boolean;
}

export interface IStatsDocument extends IStatsBase {
    full: IFullStats;
    updatedAt: Date;
    needsUpdate?: boolean;
}
