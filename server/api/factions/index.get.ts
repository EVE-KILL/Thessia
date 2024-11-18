import { defineEventHandler } from 'h3';
import { Faction } from '~/types/IFaction';

export default defineEventHandler(async (event) => {
    let factions: Faction[] = await Factions.find({}, { faction_id: 1 });
    // Return a single array containing all the IDs
    return factions.map((faction) => faction.faction_id);
});
