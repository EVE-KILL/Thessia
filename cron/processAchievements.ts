import { cliLogger } from "../server/helpers/Logger";
import { CharacterAchievements } from "../server/models/CharacterAchievements";
import { queueAchievementProcessingBulk } from "../server/queue/Achievement";

export default {
    name: "processAchievements",
    description: "Queue achievement processing for characters that need it",
    schedule: "0 * * * *", // Run every hour at minute 0
    run: async () => {
        return; // Disable the cronjob for now
        // @TODO Fix this once the achivement processing is actually mostly done and the queue is finally going down
        cliLogger.info("Processing achievements that need processing...");

        try {
            // Find all characters that need achievement processing
            const charactersNeedingProcessing =
                await CharacterAchievements.find(
                    { needs_processing: true },
                    { character_id: 1 }
                ).lean();

            if (charactersNeedingProcessing.length === 0) {
                cliLogger.info("No characters need achievement processing");
                return;
            }

            cliLogger.info(
                `Found ${charactersNeedingProcessing.length} characters needing achievement processing`
            );

            // Extract character IDs
            const characterIds = charactersNeedingProcessing.map(
                (char) => char.character_id
            );

            // Queue all characters for achievement processing in bulk
            await queueAchievementProcessingBulk(characterIds, 2); // Priority 2 for scheduled processing

            // Reset the needs_processing flag for all processed characters
            await CharacterAchievements.updateMany(
                { character_id: { $in: characterIds } },
                { needs_processing: false }
            );

            cliLogger.info(
                `Successfully queued ${characterIds.length} characters for achievement processing`
            );
        } catch (error) {
            cliLogger.error(`Failed to process achievements: ${error}`);
            throw error;
        }
    },
};
