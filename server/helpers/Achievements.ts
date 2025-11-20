import prisma from "~/lib/prisma";

export interface AchievementResult {
    character_id: number;
    character_name?: string;
    completed_achievements: number;
    total_achievements: number;
    total_points: number;
    stats: {
        kills: number;
        losses: number;
    };
}

/**
 * Minimal achievement calculator using Prisma data.
 * This replaces the old Mongo implementation and keeps the queue functional.
 */
export const AchievementService = {
    async calculateAchievements(
        characterId: number,
        characterName?: string
    ): Promise<AchievementResult> {
        // Basic kill/loss counts to drive UI metrics
        const [kills, losses] = await Promise.all([
            prisma.killmailAttacker.count({
                where: { character_id: characterId },
            }),
            prisma.killmail.count({
                where: { victim: { character_id: characterId } },
            }),
        ]);

        return {
            character_id: characterId,
            character_name: characterName,
            completed_achievements: 0,
            total_achievements: 0,
            total_points: 0,
            stats: {
                kills,
                losses,
            },
        };
    },
};
