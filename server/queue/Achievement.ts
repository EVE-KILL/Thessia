import { AchievementService } from "../helpers/Achievements";
import { cliLogger } from "../helpers/Logger";
import { createQueue } from "../helpers/Queue";
import { Characters } from "../models/Characters";

const achievementQueue = createQueue("achievement");

/**
 * Queue an achievement processing job for a specific character
 * @param characterId - The character ID to process achievements for
 * @param priority - Job priority (default: 1, higher numbers = higher priority)
 */
async function queueAchievementProcessing(characterId: number, priority = 1) {
    await achievementQueue.add(
        "achievement",
        { characterId: characterId },
        {
            priority: priority,
            attempts: 3,
            backoff: {
                type: "exponential",
                delay: 5000, // 5 seconds
            },
            removeOnComplete: 10,
            removeOnFail: 25,
        }
    );
}

/**
 * Process achievements for a single character
 * @param characterId - The character ID to process achievements for
 */
async function processAchievement(characterId: number) {
    try {
        cliLogger.info(
            `🏆 Processing achievements for character ${characterId}`
        );

        // Get character name from the database
        const character = await Characters.findOne({
            character_id: characterId,
        });
        const characterName = (character as any)?.name || undefined;

        if (!character) {
            cliLogger.warn(`⚠️ Character ${characterId} not found in database`);
        }

        // Calculate achievements for the character
        const result = await AchievementService.calculateAchievements(
            characterId,
            characterName
        );

        if (result) {
            cliLogger.info(
                `✅ Successfully processed achievements for character ${characterId} (${
                    characterName || "Unknown"
                }): ${result.completed_achievements}/${
                    result.total_achievements
                } completed (${result.total_points} points)`
            );
        } else {
            cliLogger.warn(
                `⚠️ No achievement result returned for character ${characterId}`
            );
        }

        return result;
    } catch (error: any) {
        cliLogger.error(
            `💥 Failed to process achievements for character ${characterId}: ${error.message}`
        );

        // Re-throw the error so the worker can handle it
        throw error;
    }
}

/**
 * Reprocess achievements for a character with higher priority
 * @param characterId - The character ID to reprocess achievements for
 * @param priority - Job priority (default: 10 for reprocessing)
 */
async function reprocessAchievement(characterId: number, priority = 10) {
    cliLogger.info(`🔄 Reprocessing achievements for character ${characterId}`);
    await queueAchievementProcessing(characterId, priority);
}

export { queueAchievementProcessing, processAchievement, reprocessAchievement };
