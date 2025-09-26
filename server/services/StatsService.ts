import prisma from "../../lib/prisma";
import type { Stats } from "@prisma/client";

export class StatsService {
    /**
     * Find stats by entity type, id, and days
     */
    static async findByEntityAndDays(
        entityType: string,
        entityId: number,
        days: number
    ): Promise<Stats | null> {
        return await prisma.stats.findFirst({
            where: {
                entity_type: entityType,
                entity_id: entityId,
                // Note: The old MongoDB model had a 'days' field,
                // but the Prisma schema doesn't have this field.
                // This might need schema adjustment or different logic
            },
        });
    }

    /**
     * Create or update stats
     */
    static async upsert(
        entityType: string,
        entityId: number,
        statsData: {
            kills?: number;
            losses?: number;
            total_damage_done?: number;
            total_damage_received?: number;
            total_isk_destroyed?: number;
            total_isk_lost?: number;
            last_kill_date?: Date;
            last_loss_date?: Date;
            efficiency?: number;
            avg_gang_size?: number;
            solo_kills?: number;
            solo_losses?: number;
            solo_percentage?: number;
            ships_used?: any;
            ships_lost?: any;
            most_used_ship?: any;
            most_lost_ship?: any;
            top_victims?: any;
            top_attackers?: any;
            monthly_stats?: any;
            weekly_stats?: any;
            daily_stats?: any;
            recent_activity?: any;
            full_stats?: any;
            alliance_id?: number;
            corporation_id?: number;
            character_id?: number;
        }
    ): Promise<Stats> {
        return await prisma.stats.upsert({
            where: {
                id: -1, // This is a placeholder - we need a proper unique constraint
            },
            create: {
                entity_type: entityType,
                entity_id: entityId,
                ...statsData,
            },
            update: statsData,
        });
    }

    /**
     * Get total stats count
     */
    static async getTotalCount(): Promise<number> {
        return await prisma.stats.count();
    }

    /**
     * Find stats by character
     */
    static async findByCharacter(characterId: number): Promise<Stats | null> {
        return await prisma.stats.findFirst({
            where: {
                entity_type: "character",
                entity_id: characterId,
            },
        });
    }

    /**
     * Find stats by corporation
     */
    static async findByCorporation(corporationId: number): Promise<Stats | null> {
        return await prisma.stats.findFirst({
            where: {
                entity_type: "corporation",
                entity_id: corporationId,
            },
        });
    }

    /**
     * Find stats by alliance
     */
    static async findByAlliance(allianceId: number): Promise<Stats | null> {
        return await prisma.stats.findFirst({
            where: {
                entity_type: "alliance",
                entity_id: allianceId,
            },
        });
    }
}