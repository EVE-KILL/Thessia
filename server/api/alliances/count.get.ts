import { defineEventHandler } from 'h3';

export default defineEventHandler(async (event) => {
    let count: Number = await Alliances.estimatedDocumentCount();
    return { count: count };
});
