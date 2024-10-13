export default defineEventHandler(async (event) => {
    let killmailIds = await readBody(event);

    // Verify killmailIds is an array, and it contains only numbers, and is not empty
    if (!Array.isArray(killmailIds) || killmailIds.length === 0 || killmailIds.some(id => typeof id !== 'number')) {
        throw createError({
            statusCode: 400,
            statusMessage: 'Invalid killmailIds'
        });
    }

    let killmails = await Killmails.find({ killmail_id: { $in: killmailIds } }, { _id: 0 });
    return killmails;
});
