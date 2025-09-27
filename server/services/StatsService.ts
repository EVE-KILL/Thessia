import prisma from "../../lib/prisma";

export class StatsService {
    /**
     * Find stats by entity ID and type
     */
    static async findByEntity(entityId: number, entityType: string) {
        return await prisma.statss.findFirst({
            where: {
                entity_id: entityId,
                entity_type: entityType,
            },
        });
    }

    /**
     * Find stats for multiple entities
     */
    static async findByEntities(
        entities: Array<{ entityId: number; entityType: string }>
    ) {
        return await prisma.stats.findMany({
            where: {
                OR: entities.map(({ entityId, entityType }) => ({
                    entity_id: entityId,
                    entity_type: entityType,
                })),
            },
        });
    }

    /**
     * Create or update stats for an entity
     */
    static async upsertStats(statsData: {
        entity_id: number;
        entity_type: string;
        kills: number;
        losses: number;
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
    }) {
        return await prisma.stats.upsert({
            where: {
                entity_id_entity_type: {
                    entity_id: statsData.entity_id,
                    entity_type: statsData.entity_type,
                },
            },
            update: statsData,
            create: statsData,
        });
    }

    /**
     * Get stats for character
     */
    static async getCharacterStats(characterId: number) {
        return await this.findByEntity(characterId, "character");
    }

    /**
     * Get stats for corporation
     */
    static async getCorporationStats(corporationId: number) {
        return await this.findByEntity(corporationId, "corporation");
    }

    /**
     * Get stats for alliance
     */
    static async getAllianceStats(allianceId: number) {
        return await this.findByEntity(allianceId, "alliance");
    }

    /**
     * Get stats for ship type
     */
    static async getShipStats(shipTypeId: number) {
        return await this.findByEntity(shipTypeId, "ship");
    }

    /**
     * Get stats for solar system
     */
    static async getSystemStats(systemId: number) {
        return await this.findByEntity(systemId, "system");
    }

    /**
     * Get stats for region
     */
    static async getRegionStats(regionId: number) {
        return await this.findByEntity(regionId, "region");
    }

    /**
     * Get top characters by kills
     */
    static async getTopCharactersByKills(limit: number = 10) {
        return await prisma.stats.findMany({
            where: { entity_type: "character" },
            orderBy: { kills: "desc" },
            take: limit,
        });
    }

    /**
     * Get top corporations by kills
     */
    static async getTopCorporationsByKills(limit: number = 10) {
        return await prisma.stats.findMany({
            where: { entity_type: "corporation" },
            orderBy: { kills: "desc" },
            take: limit,
        });
    }

    /**
     * Get top alliances by kills
     */
    static async getTopAlliancesByKills(limit: number = 10) {
        return await prisma.stats.findMany({
            where: { entity_type: "alliance" },
            orderBy: { kills: "desc" },
            take: limit,
        });
    }

    /**
     * Get top ships by usage
     */
    static async getTopShipsByUsage(limit: number = 10) {
        return await prisma.stats.findMany({
            where: { entity_type: "ship" },
            orderBy: { kills: "desc" },
            take: limit,
        });
    }

    /**
     * Get top systems by activity
     */
    static async getTopSystemsByActivity(limit: number = 10) {
        return await prisma.stats.findMany({
            where: { entity_type: "system" },
            orderBy: [{ kills: "desc" }, { losses: "desc" }],
            take: limit,
        });
    }

    /**
     * Get efficiency leaderboard
     */
    static async getTopByEfficiency(entityType: string, limit: number = 10) {
        return await prisma.stats.findMany({
            where: {
                entity_type: entityType,
                efficiency: { not: null },
                kills: { gt: 10 }, // Only include entities with meaningful activity
            },
            orderBy: { efficiency: "desc" },
            take: limit,
        });
    }

    /**
     * Get ISK destroyed leaderboard
     */
    static async getTopByISKDestroyed(entityType: string, limit: number = 10) {
        return await prisma.stats.findMany({
            where: {
                entity_type: entityType,
                total_isk_destroyed: { not: null },
            },
            orderBy: { total_isk_destroyed: "desc" },
            take: limit,
        });
    }

    /**
     * Get solo PvP leaderboard
     */
    static async getTopSoloPvP(limit: number = 10) {
        return await prisma.stats.findMany({
            where: {
                entity_type: "character",
                solo_kills: { gt: 0 },
            },
            orderBy: { solo_kills: "desc" },
            take: limit,
        });
    }

    /**
     * Update stats for multiple entities (bulk operation)
     */
    static async bulkUpdateStats(
        statsDataArray: Array<{
            entity_id: number;
            entity_type: string;
            kills: number;
            losses: number;
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
        }>
    ) {
        return await Promise.all(
            statsDataArray.map((statsData) => this.upsertStats(statsData))
        );
    }

    /**
     * Get aggregate statistics
     */
    static async getGlobalStats() {
        const result = await prisma.stats.aggregate({
            _sum: {
                kills: true,
                losses: true,
                total_isk_destroyed: true,
                total_isk_lost: true,
            },
            _count: {
                entity_id: true,
            },
        });

        return {
            totalKills: result._sum.kills || 0,
            totalLosses: result._sum.losses || 0,
            totalISKDestroyed: result._sum.total_isk_destroyed || 0,
            totalISKLost: result._sum.total_isk_lost || 0,
            totalEntities: result._count.entity_id || 0,
        };
    }

    /**
     * Get activity statistics by date range
     */
    static async getActivityByDateRange(startDate: Date, endDate: Date) {
        return await prisma.stats.findMany({
            where: {
                OR: [
                    {
                        last_kill_date: {
                            gte: startDate,
                            lte: endDate,
                        },
                    },
                    {
                        last_loss_date: {
                            gte: startDate,
                            lte: endDate,
                        },
                    },
                ],
            },
            orderBy: [{ last_kill_date: "desc" }, { last_loss_date: "desc" }],
        });
    }

    /**
     * Search stats by entity type and minimum activity
     */
    static async searchStats(
        entityType: string,
        minKills: number = 0,
        limit: number = 100
    ) {
        return await prisma.stats.findMany({
            where: {
                entity_type: entityType,
                kills: { gte: minKills },
            },
            orderBy: { kills: "desc" },
            take: limit,
        });
    }

    /**
     * Delete stats for an entity
     */
    static async deleteStats(entityId: number, entityType: string) {
        return await prisma.stats.delete({
            where: {
                entity_id_entity_type: {
                    entity_id: entityId,
                    entity_type: entityType,
                },
            },
        });
    }

    /**
     * Count total stat entries
     */
    static async count(): Promise<number> {
        return await prisma.stats.count();
    }

    /**
     * Count stats by entity type
     */
    static async countByType(entityType: string): Promise<number> {
        return await prisma.stats.count({
            where: { entity_type: entityType },
        });
    }
}
