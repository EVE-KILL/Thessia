import { PrismaClient } from "@prisma/client";
import { cliLogger } from "../../server/helpers/Logger";
import { CharacterAchievements } from "../../server/models/CharacterAchievements";
import { disableForeignKeyChecks, enableForeignKeyChecks } from "./foreignKeys";

const prisma = new PrismaClient();

export const migrateCharacterAchievements = async () => {
    cliLogger.info("Migrating character achievements...");
    await disableForeignKeyChecks();

    try {
        const achievements = await CharacterAchievements.find().lean();
        const total = achievements.length;
        let processed = 0;

        for (const achievement of achievements) {
            const mappedData: any = {
                character_id: achievement.character_id,
                character_name: achievement.character_name,
                total_points: achievement.total_points,
                completed_achievements: achievement.completed_achievements,
                total_achievements: achievement.total_achievements,
                last_calculated: achievement.last_calculated,
                needs_processing: achievement.needs_processing,
                created_at: achievement.createdAt,
                updated_at: achievement.updatedAt,
            };

            await prisma.characterAchievements.create({
                data: mappedData,
            });

            processed++;
            cliLogger.info(
                `Processed ${processed}/${total} character achievements`
            );
        }
    } catch (err) {
        cliLogger.error("Error migrating character achievements", err);
    } finally {
        await enableForeignKeyChecks();
        await prisma.$disconnect();
    }

    cliLogger.info("Finished migrating character achievements.");
};
