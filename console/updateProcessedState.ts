import { KillmailsESI } from "../server/models/KillmailsESI";
import { Killmails } from "../server/models/Killmails";

export default {
    name: "update:processedstate",
    description: "Updates the processed state of a killmail",
    longRunning: false,
    run: async () => {
        console.log("Starting killmail processing state update...");

        // Fetch all killmail IDs from KillmailsESI where processed doesn't exist
        const unprocessedKillmails = await KillmailsESI.find(
            { processed: { $exists: false } },
            { killmail_id: 1 }
        ).lean();

        const totalToProcess = unprocessedKillmails.length;
        console.log(`Found ${totalToProcess} killmails to process`);

        if (totalToProcess === 0) {
            console.log('No unprocessed killmails found. Processing complete.');
            return {
                processedTrueCount: 0,
                processedFalseCount: 0,
                totalProcessed: 0
            };
        }

        // Extract killmail IDs
        const killmailIds = unprocessedKillmails.map(doc => doc.killmail_id);

        // Find which killmail IDs exist in the Killmails collection
        const existingKillmails = await Killmails.find(
            { killmail_id: { $in: killmailIds } },
            { killmail_id: 1 }
        ).lean();

        // Create a Set for efficient lookups
        const existingKillmailSet = new Set(existingKillmails.map(k => k.killmail_id));

        // Prepare bulk operations
        const bulkOps = [];
        let processedTrue = 0;
        let processedFalse = 0;

        for (const doc of unprocessedKillmails) {
            const exists = existingKillmailSet.has(doc.killmail_id);

            bulkOps.push({
                updateOne: {
                    filter: { killmail_id: doc.killmail_id },
                    update: { $set: { processed: exists } }
                }
            });

            if (exists) {
                processedTrue++;
            } else {
                processedFalse++;
            }
        }

        // Execute bulk operations
        console.log(`Processing ${totalToProcess} killmails:`);
        console.log(`- ${processedTrue} will be marked as processed`);
        console.log(`- ${processedFalse} will be marked as unprocessed`);

        await KillmailsESI.bulkWrite(bulkOps);

        console.log('Processing complete. Summary:');
        console.log(`- Total killmails processed: ${totalToProcess}`);
        console.log(`- Killmails marked as processed: ${processedTrue}`);
        console.log(`- Killmails marked as unprocessed: ${processedFalse}`);

        return {
            processedTrueCount: processedTrue,
            processedFalseCount: processedFalse,
            totalProcessed: totalToProcess
        };
    }
};
