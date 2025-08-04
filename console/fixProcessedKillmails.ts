import { cliLogger } from "../server/helpers/Logger";
import { Killmails } from "../server/models/Killmails";
import { KillmailsESI } from "../server/models/KillmailsESI";

export default {
    name: "fixProcessedKillmails",
    description:
        "Compare Killmails and KillmailsESI collections and fix processed flags for orphaned ESI killmails",
    longRunning: false,
    run: async () => {
        cliLogger.info("🔍 Starting killmail collection comparison...");

        try {
            // Get total counts for both collections
            const killmailsCount = await Killmails.estimatedDocumentCount();
            const esiKillmailsCount =
                await KillmailsESI.estimatedDocumentCount();

            cliLogger.info(`📊 Collection counts:`);
            cliLogger.info(`   Killmails: ${killmailsCount.toLocaleString()}`);
            cliLogger.info(
                `   KillmailsESI: ${esiKillmailsCount.toLocaleString()}`
            );
            cliLogger.info(
                `   Collection difference: ${(
                    esiKillmailsCount - killmailsCount
                ).toLocaleString()}`
            );

            // Find processed ESI killmails that don't exist in the main Killmails collection
            cliLogger.info("🔍 Finding orphaned processed ESI killmails...");

            // Use cursor-based approach for better performance
            const orphanedKillmails: Array<{
                killmail_id: number;
                killmail_hash: string;
            }> = [];

            const checkBatchSize = 10_000;
            let processedCount = 0;
            let checkedCount = 0;

            // Get a cursor for processed ESI killmails
            const cursor = KillmailsESI.find(
                { processed: true },
                { killmail_id: 1, killmail_hash: 1 }
            ).cursor();

            const batch: Array<{
                killmail_id: number;
                killmail_hash: string;
            }> = [];

            for (
                let doc = await cursor.next();
                doc != null;
                doc = await cursor.next()
            ) {
                batch.push({
                    killmail_id: (doc as any).killmail_id,
                    killmail_hash: (doc as any).killmail_hash,
                });
                checkedCount++;

                if (batch.length >= checkBatchSize) {
                    // Check existence for this batch using $in for efficiency
                    const killmailIds = batch.map((km) => km.killmail_id);
                    const existingIds = await Killmails.find(
                        {
                            killmail_id: { $in: killmailIds },
                        },
                        { killmail_id: 1, killmail_hash: 1 }
                    ).lean();

                    // Create a Set for fast lookup
                    const existingSet = new Set(
                        existingIds.map(
                            (km: any) => `${km.killmail_id}:${km.killmail_hash}`
                        )
                    );

                    // Find orphaned killmails in this batch
                    for (const km of batch) {
                        const key = `${km.killmail_id}:${km.killmail_hash}`;
                        if (!existingSet.has(key)) {
                            orphanedKillmails.push(km);
                        }
                    }

                    processedCount++;
                    if (processedCount % 10 === 0) {
                        cliLogger.info(
                            `   Processed ${(
                                processedCount * checkBatchSize
                            ).toLocaleString()} records, found ${orphanedKillmails.length.toLocaleString()} orphaned so far...`
                        );
                    }

                    // Clear batch for next iteration
                    batch.length = 0;
                }
            }

            // Process remaining batch
            if (batch.length > 0) {
                const killmailIds = batch.map((km) => km.killmail_id);
                const existingIds = await Killmails.find(
                    {
                        killmail_id: { $in: killmailIds },
                    },
                    { killmail_id: 1, killmail_hash: 1 }
                ).lean();

                const existingSet = new Set(
                    existingIds.map(
                        (km: any) => `${km.killmail_id}:${km.killmail_hash}`
                    )
                );

                for (const km of batch) {
                    const key = `${km.killmail_id}:${km.killmail_hash}`;
                    if (!existingSet.has(key)) {
                        orphanedKillmails.push(km);
                    }
                }
            }

            cliLogger.info(
                `   Checked ${checkedCount.toLocaleString()} processed ESI killmails total`
            );

            const orphanedCount = orphanedKillmails.length;
            cliLogger.info(
                `🚨 Found ${orphanedCount.toLocaleString()} orphaned processed ESI killmails`
            );

            if (orphanedCount === 0) {
                cliLogger.info(
                    "✅ No orphaned killmails found - all processed ESI killmails exist in Killmails collection"
                );
                return;
            }

            // Ask for confirmation before proceeding
            cliLogger.info(
                `⚠️  About to set processed: false for ${orphanedCount.toLocaleString()} ESI killmails`
            );
            cliLogger.info("🔧 Proceeding with the fix...");

            // Batch update the orphaned killmails to set processed: false
            const batchSize = 1000;
            let fixedCount = 0;

            for (let i = 0; i < orphanedKillmails.length; i += batchSize) {
                const batch = orphanedKillmails.slice(i, i + batchSize);
                const killmailIds = batch.map((km) => km.killmail_id);

                const result = await KillmailsESI.updateMany(
                    {
                        killmail_id: { $in: killmailIds },
                        processed: true,
                    },
                    {
                        $set: { processed: false },
                    }
                );

                fixedCount += result.modifiedCount;
                cliLogger.info(
                    `   Updated batch ${Math.floor(i / batchSize) + 1}: ${
                        result.modifiedCount
                    } records`
                );
            }

            cliLogger.info(
                `✅ Successfully fixed ${fixedCount.toLocaleString()} orphaned ESI killmails`
            );

            // Final verification - quick count of remaining processed records
            const finalProcessedCount = await KillmailsESI.countDocuments({
                processed: true,
            });

            if (finalProcessedCount === 0) {
                cliLogger.info(
                    "🎉 All processed ESI killmails have been fixed!"
                );
            } else {
                cliLogger.info(
                    `📊 ${finalProcessedCount.toLocaleString()} ESI killmails still marked as processed`
                );
            }

            cliLogger.info("✅ Killmail processing completed successfully!");
        } catch (error) {
            cliLogger.error(`❌ Error during killmail comparison: ${error}`);
            throw error;
        }
    },
};
