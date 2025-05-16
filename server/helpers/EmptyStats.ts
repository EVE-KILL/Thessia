import type { IFullStats, IStatsDocument, StatsType } from '~/server/interfaces/IStats';

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
