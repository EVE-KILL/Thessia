import prisma from "../../lib/prisma";

export class HistoricalStatsService {
    /**
     * Find historical stats by date and entity
     */
    static async findByDateAndEntity(
        date: Date,
        entityId: number,
        entityType: string
    ) {
        return await prisma.historicalStat.findFirst({
            where: {
                date,
                entity_id: entityId,
                entity_type: entityType,
            },
        });
    }

    /**
     * Find historical stats for an entity within date range
     */
    static async findByEntityAndDateRange(
        entityId: number,
        entityType: string,
        startDate: Date,
        endDate: Date
    ) {
        return await prisma.historicalStat.findMany({
            where: {
                entity_id: entityId,
                entity_type: entityType,
                date: {
                    gte: startDate,
                    lte: endDate,
                },
            },
            orderBy: { date: "asc" },
        });
    }

    /**
     * Find historical stats for multiple entities on a specific date
     */
    static async findByDateAndEntities(
        date: Date,
        entities: Array<{ entityId: number; entityType: string }>
    ) {
        return await prisma.historicalStat.findMany({
            where: {
                date,
                OR: entities.map(({ entityId, entityType }) => ({
                    entity_id: entityId,
                    entity_type: entityType,
                })),
            },
        });
    }

    /**
     * Create or update historical stats entry
     */
    static async upsertHistoricalStats(statsData: {
        date: Date;
        entity_id: number;
        entity_type: string;
        kills: number;
        losses: number;
        total_damage_done?: number;
        total_damage_received?: number;
        total_isk_destroyed?: number;
        total_isk_lost?: number;
        efficiency?: number;
        ship_count?: number;
        pilot_count?: number;
        active_pilots?: number;
        avg_gang_size?: number;
        solo_kills?: number;
        solo_losses?: number;
        isk_per_kill?: number;
        isk_per_loss?: number;
        most_used_ship?: any;
        most_lost_ship?: any;
        monthly_aggregate?: any;
        weekly_aggregate?: any;
    }) {
        return await prisma.historicalStat.upsert({
            where: {
                date_entity_id_entity_type: {
                    date: statsData.date,
                    entity_id: statsData.entity_id,
                    entity_type: statsData.entity_type,
                },
            },
            update: statsData,
            create: statsData,
        });
    }

    /**
     * Get historical stats for character
     */
    static async getCharacterHistory(characterId: number, days: number = 30) {
        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);

        return await this.findByEntityAndDateRange(
            characterId,
            "character",
            startDate,
            endDate
        );
    }

    /**
     * Get historical stats for corporation
     */
    static async getCorporationHistory(
        corporationId: number,
        days: number = 30
    ) {
        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);

        return await this.findByEntityAndDateRange(
            corporationId,
            "corporation",
            startDate,
            endDate
        );
    }

    /**
     * Get historical stats for alliance
     */
    static async getAllianceHistory(allianceId: number, days: number = 30) {
        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);

        return await this.findByEntityAndDateRange(
            allianceId,
            "alliance",
            startDate,
            endDate
        );
    }

    /**
     * Get trends for an entity (comparing periods)
     */
    static async getTrends(
        entityId: number,
        entityType: string,
        days: number = 7
    ) {
        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);

        const compareEndDate = new Date(startDate);
        const compareStartDate = new Date(startDate);
        compareStartDate.setDate(compareStartDate.getDate() - days);

        const [currentPeriod, previousPeriod] = await Promise.all([
            this.findByEntityAndDateRange(
                entityId,
                entityType,
                startDate,
                endDate
            ),
            this.findByEntityAndDateRange(
                entityId,
                entityType,
                compareStartDate,
                compareEndDate
            ),
        ]);

        const currentTotals = this.calculateTotals(currentPeriod);
        const previousTotals = this.calculateTotals(previousPeriod);

        return {
            current: currentTotals,
            previous: previousTotals,
            trends: this.calculateTrendPercentages(
                currentTotals,
                previousTotals
            ),
        };
    }

    /**
     * Bulk create or update historical stats
     */
    static async bulkUpsertHistoricalStats(
        statsArray: Array<{
            date: Date;
            entity_id: number;
            entity_type: string;
            kills: number;
            losses: number;
            total_damage_done?: number;
            total_damage_received?: number;
            total_isk_destroyed?: number;
            total_isk_lost?: number;
            efficiency?: number;
            ship_count?: number;
            pilot_count?: number;
            active_pilots?: number;
            avg_gang_size?: number;
            solo_kills?: number;
            solo_losses?: number;
            isk_per_kill?: number;
            isk_per_loss?: number;
            most_used_ship?: any;
            most_lost_ship?: any;
            monthly_aggregate?: any;
            weekly_aggregate?: any;
        }>
    ) {
        return await Promise.all(
            statsArray.map((statsData) => this.upsertHistoricalStats(statsData))
        );
    }

    /**
     * Get daily activity summary for a date range
     */
    static async getDailyActivitySummary(startDate: Date, endDate: Date) {
        const result = await prisma.historicalStat.groupBy({
            by: ["date"],
            where: {
                date: {
                    gte: startDate,
                    lte: endDate,
                },
            },
            _sum: {
                kills: true,
                losses: true,
                total_isk_destroyed: true,
                total_isk_lost: true,
            },
            _count: {
                entity_id: true,
            },
            orderBy: {
                date: "asc",
            },
        });

        return result.map((item) => ({
            date: item.date,
            totalKills: item._sum.kills || 0,
            totalLosses: item._sum.losses || 0,
            totalISKDestroyed: item._sum.total_isk_destroyed || 0,
            totalISKLost: item._sum.total_isk_lost || 0,
            activeEntities: item._count.entity_id || 0,
        }));
    }

    /**
     * Delete old historical stats (older than specified date)
     */
    static async deleteOldStats(olderThan: Date) {
        return await prisma.historicalStat.deleteMany({
            where: {
                date: {
                    lt: olderThan,
                },
            },
        });
    }

    /**
     * Helper: Calculate totals from historical stats array
     */
    private static calculateTotals(stats: any[]) {
        return stats.reduce(
            (totals, stat) => ({
                kills: totals.kills + (stat.kills || 0),
                losses: totals.losses + (stat.losses || 0),
                iskDestroyed:
                    totals.iskDestroyed + (stat.total_isk_destroyed || 0),
                iskLost: totals.iskLost + (stat.total_isk_lost || 0),
                damageDealt: totals.damageDealt + (stat.total_damage_done || 0),
                damageTaken:
                    totals.damageTaken + (stat.total_damage_received || 0),
                soloKills: totals.soloKills + (stat.solo_kills || 0),
                soloLosses: totals.soloLosses + (stat.solo_losses || 0),
            }),
            {
                kills: 0,
                losses: 0,
                iskDestroyed: 0,
                iskLost: 0,
                damageDealt: 0,
                damageTaken: 0,
                soloKills: 0,
                soloLosses: 0,
            }
        );
    }

    /**
     * Helper: Calculate trend percentages
     */
    private static calculateTrendPercentages(current: any, previous: any) {
        const calculatePercentChange = (curr: number, prev: number) => {
            if (prev === 0) return curr > 0 ? 100 : 0;
            return Math.round(((curr - prev) / prev) * 100);
        };

        return {
            kills: calculatePercentChange(current.kills, previous.kills),
            losses: calculatePercentChange(current.losses, previous.losses),
            iskDestroyed: calculatePercentChange(
                current.iskDestroyed,
                previous.iskDestroyed
            ),
            iskLost: calculatePercentChange(current.iskLost, previous.iskLost),
            efficiency:
                current.kills + current.losses > 0
                    ? Math.round(
                          (current.iskDestroyed /
                              (current.iskDestroyed + current.iskLost)) *
                              100
                      )
                    : 0,
        };
    }

    /**
     * Count total historical stat entries
     */
    static async count(): Promise<number> {
        return await prisma.historicalStat.count();
    }

    /**
     * Count historical stats by entity type
     */
    static async countByType(entityType: string): Promise<number> {
        return await prisma.historicalStat.count({
            where: { entity_type: entityType },
        });
    }
}
