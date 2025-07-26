import mongoose from "mongoose";
import { Killmails } from "~/server/models/Killmails";
import { AchievementService } from "~/server/helpers/Achievements";

// Change this character ID to test different characters
const TEST_CHARACTER_ID = 268946627; // Change this to any character ID you want to test

export default {
    name: "test:temporal-achievements",
    description: "Tests temporal achievements (Sweet Revenge)",
    longRunning: false,
    run: async () => {
        console.log(
            `Testing temporal achievements for character ID: ${TEST_CHARACTER_ID}`
        );
        console.log("=".repeat(60));

        // First, let's see if this character has any kills and losses
        const killCount = await Killmails.countDocuments({
            is_npc: false,
            "attackers.character_id": TEST_CHARACTER_ID,
            "attackers.final_blow": true,
        });

        const lossCount = await Killmails.countDocuments({
            is_npc: false,
            "victim.character_id": TEST_CHARACTER_ID,
        });

        console.log(`Character has ${killCount} kills and ${lossCount} losses`);

        if (killCount === 0 && lossCount === 0) {
            console.log(
                "❌ Character has no activity, can't test temporal achievements"
            );
            return { result: "no_activity" };
        }

        console.log("\n🔍 Testing temporal achievements...");
        const temporalAchievements = [
            //"sweet_revenge",
            //"killing_spree",
            //"nullbloc_private",
            "david_vs_goliath",
            //"rampage",
        ];

        for (const achId of temporalAchievements) {
            console.log(`\n--- Testing ${achId} ---`);
            const result = await AchievementService.testSingleAchievement(
                TEST_CHARACTER_ID,
                achId
            );
            if (result.achievement) {
                const isCompleted =
                    result.count >= (result.achievement.threshold || 1);
                console.log(
                    `   ${result.achievement.name}: ${result.count} (${
                        isCompleted ? "Completed" : "Not completed"
                    })`
                );
                console.log(
                    `   Description: ${result.achievement.description}`
                );
                console.log(
                    `   Points: ${result.achievement.points} (${result.achievement.rarity})`
                );
            } else {
                console.log(`   ❌ Achievement ${achId} not found`);
            }
        }

        return {
            result: "success",
            characterId: TEST_CHARACTER_ID,
            killCount,
            lossCount,
        };
    },
};
