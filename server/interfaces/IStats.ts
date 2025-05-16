export type StatsType = 'character_id' | 'corporation_id' | 'alliance_id';

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

export interface IFullStats {
    mostUsedShips: Record<string, { count: number; name: Record<string, string> }>;
    mostLostShips: Record<string, { count: number; name: Record<string, string> }>;
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
