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
            const processedESICount = esiKillmailsCount - killmailsCount;

            cliLogger.info(`📊 Collection counts:`);
            cliLogger.info(`   Killmails: ${killmailsCount.toLocaleString()}`);
            cliLogger.info(
                `   KillmailsESI: ${esiKillmailsCount.toLocaleString()}`
            );
            cliLogger.info(
                `   KillmailsESI (processed: true): ${processedESICount.toLocaleString()}`
            );
            cliLogger.info(
                `   Difference: ${(
                    esiKillmailsCount - killmailsCount
                ).toLocaleString()}`
            );

            // Find processed ESI killmails that don't exist in the main Killmails collection
            cliLogger.info("🔍 Finding orphaned processed ESI killmails...");

            // Use aggregation to find ESI killmails marked as processed but not in Killmails
            const orphanedKillmails = await KillmailsESI.aggregate(
                [
                    // Only look at processed ESI killmails
                    { $match: { processed: true } },

                    // Project only the fields we need for the lookup
                    {
                        $project: {
                            killmail_id: 1,
                            killmail_hash: 1,
                        },
                    },

                    // Left join with Killmails collection
                    {
                        $lookup: {
                            from: "killmails",
                            let: {
                                esi_id: "$killmail_id",
                                esi_hash: "$killmail_hash",
                            },
                            pipeline: [
                                {
                                    $match: {
                                        $expr: {
                                            $and: [
                                                {
                                                    $eq: [
                                                        "$killmail_id",
                                                        "$$esi_id",
                                                    ],
                                                },
                                                {
                                                    $eq: [
                                                        "$killmail_hash",
                                                        "$$esi_hash",
                                                    ],
                                                },
                                            ],
                                        },
                                    },
                                },
                            ],
                            as: "killmail_match",
                        },
                    },

                    // Only keep ESI killmails that don't have a match in Killmails
                    {
                        $match: {
                            killmail_match: { $size: 0 },
                        },
                    },

                    // Project the final result
                    {
                        $project: {
                            killmail_id: 1,
                            killmail_hash: 1,
                        },
                    },
                ],
                { allowDiskUse: true }
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

            // Final verification
            const remainingOrphaned = await KillmailsESI.aggregate(
                [
                    { $match: { processed: true } },
                    {
                        $lookup: {
                            from: "killmails",
                            let: {
                                esi_id: "$killmail_id",
                                esi_hash: "$killmail_hash",
                            },
                            pipeline: [
                                {
                                    $match: {
                                        $expr: {
                                            $and: [
                                                {
                                                    $eq: [
                                                        "$killmail_id",
                                                        "$$esi_id",
                                                    ],
                                                },
                                                {
                                                    $eq: [
                                                        "$killmail_hash",
                                                        "$$esi_hash",
                                                    ],
                                                },
                                            ],
                                        },
                                    },
                                },
                            ],
                            as: "killmail_match",
                        },
                    },
                    {
                        $match: {
                            killmail_match: { $size: 0 },
                        },
                    },
                    {
                        $count: "orphaned_count",
                    },
                ],
                { allowDiskUse: true }
            );

            const finalOrphanedCount =
                remainingOrphaned.length > 0
                    ? remainingOrphaned[0].orphaned_count
                    : 0;

            if (finalOrphanedCount === 0) {
                cliLogger.info(
                    "🎉 All orphaned ESI killmails have been fixed!"
                );
            } else {
                cliLogger.info(
                    `⚠️  ${finalOrphanedCount} orphaned ESI killmails still remain`
                );
            }

            // Show final statistics
            const finalProcessedCount = await KillmailsESI.countDocuments({
                processed: true,
            });
            cliLogger.info(
                `📊 Final processed ESI killmails: ${finalProcessedCount.toLocaleString()}`
            );
        } catch (error) {
            cliLogger.error(`❌ Error during killmail comparison: ${error}`);
            throw error;
        }
    },
};
