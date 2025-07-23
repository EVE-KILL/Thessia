import { queueAchievementProcessing } from "~/server/queue/Achievement";
import { cliLogger } from "~/server/helpers/Logger";
import { Stats } from "~/server/models/Stats";

export default {
    name: "backfillAchievements",
    description:
        "Backfill achievements for all characters with stats by queuing them for processing",
    longRunning: false,
    run: async () => {
        cliLogger.info(
            `🏆 Starting achievement backfill queue for all characters`
        );

        try {
            cliLogger.info(
                `🔍 Finding all character IDs from Stats collection...`
            );

            // Get all character IDs from the Stats collection where type is 'character_id'
            // These are already unique so no need for distinct or batching
            const characterStats = await Stats.find(
                { type: "character_id", days: 0, id: { $gte: 3_999_999 } },
                { id: 1 }, // Only select the id field (which is the character_id)
                { sort: { id: 1 }, limit: 500 } // Sort by character ID for consistent ordering
            );

            const characterIds = characterStats.map((stat) => stat.id);
            cliLogger.info(
                `✅ Found ${characterIds.length} characters to process from Stats collection`
            );

            // Filter out any null/undefined IDs
            let validCharacterIds = characterIds.filter((id) => id != null);
            validCharacterIds = validCharacterIds.filter((id) => id > 0);
            cliLogger.info(
                `🔢 Valid character IDs: ${validCharacterIds.length}/${characterIds.length}`
            );

            let queued = 0;

            cliLogger.info(
                `Starting to queue ${validCharacterIds.length} characters for achievement processing...`
            );

            for (const characterId of validCharacterIds) {
                // Queue the character for achievement processing
                await queueAchievementProcessing(characterId, 1);
                queued++;

                // Log progress every 1000 characters
                if (queued % 1000 === 0) {
                    cliLogger.info(
                        `📋 Queued ${queued}/${validCharacterIds.length} characters`
                    );
                }
            }

            cliLogger.info(`🎉 Achievement backfill queueing completed!`);
            cliLogger.info(`📊 Final Results:`);
            cliLogger.info(
                `   - Total Characters Found: ${validCharacterIds.length}`
            );
            cliLogger.info(`   - Successfully Queued: ${queued}`);
            cliLogger.info(`   - Success Rate: 100%`);
            cliLogger.info(
                `ℹ️ Characters are now queued for processing. Check the achievement worker logs for processing progress.`
            );
        } catch (error) {
            cliLogger.error(
                `💥 Error during achievement backfill queueing: ${error}`
            );
            throw error;
        }
    },
};
