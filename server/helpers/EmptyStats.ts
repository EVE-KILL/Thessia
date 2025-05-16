import type { IFullStats, IStatsDocument, StatsType } from '~/server/interfaces/IStats';

export function ensureData(data: Partial<IStatsDocument>): Partial<IStatsDocument> {
    return {
        type: data.type || 'character_id',
        id: data.id || 0,
        days: data.days || 0,
        kills: data.kills || 0,
        losses: data.losses || 0,
        iskKilled: data.iskKilled || 0,
        iskLost: data.iskLost || 0,
        npcLosses: data.npcLosses || 0,
        soloKills: data.soloKills || 0,
        soloLosses: data.soloLosses || 0,
        lastActive: data.lastActive || null,
        full: data.full || {
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
