import { defineEventHandler } from 'h3';

export default defineEventHandler(async (event) => {
    let count: Number = await Factions.estimatedDocumentCount();
    return { count: count };
});
