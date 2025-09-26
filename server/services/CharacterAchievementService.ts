import prisma from "../../lib/prisma";
import type { CharacterAchievements } from "@prisma/client";

export class CharacterAchievementService {
    /**
     * Find character achievements by character_id
     */
    static async findByCharacterId(characterId: number): Promise<CharacterAchievements | null> {
        return await prisma.characterAchievements.findUnique({
            where: { character_id: characterId },
            include: {
                achievements: true,
            },
        });
    }

    /**
     * Create or update character achievements
     */
    static async upsert(data: {
        character_id: number;
        total_points?: number;
        completed_achievements?: number;
        total_achievements?: number;
        needs_processing?: boolean;
    }): Promise<CharacterAchievements> {
        return await prisma.characterAchievements.upsert({
            where: { character_id: data.character_id },
            create: data,
            update: data,
        });
    }

    /**
     * Get total achievements count
     */
    static async getTotalCount(): Promise<number> {
        return await prisma.characterAchievements.count();
    }
}