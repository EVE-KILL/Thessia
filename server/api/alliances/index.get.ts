import { defineEventHandler } from 'h3';
import { Alliance } from '~/types/IAlliance';

export default defineEventHandler(async (event) => {
    let alliances: Alliance[] = await Alliances.find({}, { alliance_id: 1 });
    // Return a single array containing all the IDs
    return alliances.map((alliance) => alliance.alliance_id);
});
