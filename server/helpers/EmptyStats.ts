import type { IFullStats, IStatsDocument, StatsType } from '~/server/interfaces/IStats';

export function ensureData(data: Partial<IStatsDocument> | null | undefined): Partial<IStatsDocument> {
    // Handle the case where data might be null or undefined
    const safeData = data || {};

    return {
        type: safeData.type || 'character_id',
        id: safeData.id || 0,
        days: safeData.days || 0,
        kills: safeData.kills || 0,
        losses: safeData.losses || 0,
        iskKilled: safeData.iskKilled || 0,
        iskLost: safeData.iskLost || 0,
        npcLosses: safeData.npcLosses || 0,
        soloKills: safeData.soloKills || 0,
        soloLosses: safeData.soloLosses || 0,
        lastActive: safeData.lastActive || null,
        full: safeData.full || {
            mostUsedShips: {},
            mostLostShips: {},
            diesToCorporations: {},
            diesToAlliances: {},
            blobFactor: 0,
            heatMap: {},
            fliesWithCorporations: {},
            fliesWithAlliances: {},
            sameShipAsOtherAttackers: 0,
            possibleFC: false,
            possibleCynoAlt: false,
        },
        updatedAt: new Date(),
    };
}
/**
 * Creates an empty stats document with default values
 * @param type Entity type (character_id, corporation_id, alliance_id)
 * @param id Entity ID
 * @param days Time period in days (0 for all time)
 * @returns Empty stats document
 */
export function createEmptyStats(type: StatsType, id: number, days: number): IStatsDocument {
    // Create empty heat map with zeros for all hours
    const heatMap: Record<string, number> = {};
    for (let i = 0; i < 24; i++) {
        const hourString = `h${i.toString().padStart(2, "0")}`;
        heatMap[hourString] = 0;
    }

    // Create the full stats structure with empty values
    const full: IFullStats = {
        mostUsedShips: {},
        mostLostShips: {},
        diesToCorporations: {},
        diesToAlliances: {},
        blobFactor: 0,
        heatMap,
        fliesWithCorporations: {},
        fliesWithAlliances: {},
        sameShipAsOtherAttackers: 0,
        possibleFC: false,
        possibleCynoAlt: false,
    };

    // Return the complete empty stats document
    return {
        type,
        id,
        days,
        kills: 0,
        losses: 0,
        iskKilled: 0,
        iskLost: 0,
        npcLosses: 0,
        soloKills: 0,
        soloLosses: 0,
        lastActive: null,
        full,
        updatedAt: new Date(),
    };
}
