import { defineEventHandler } from 'h3';
import { Corporation } from '~/types/ICorporation';

export default defineEventHandler(async (event) => {
    let corporations: Corporation[] = await Corporations.find({}, { corporation_id: 1 });
    // Return a single array containing all the IDs
    return corporations.map((corporation) => corporation.corporation_id);
});
