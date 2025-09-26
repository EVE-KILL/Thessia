import type { Prisma } from "@prisma/client";
import prisma from "../../lib/prisma";

interface WarFilters {
    entityId?: number | null;
    entityType?: "corporation" | "alliance";
    tab?: string;
    ongoing?: boolean;
    mutual?: boolean;
    openToAllies?: boolean;
    hasActivity?: boolean;
}

export class WarService {
    /**
     * Search wars with complex filtering and pagination
     */
    static async searchWithPagination({
        page = 1,
        limit = 25,
        entityId,
        entityType,
        tab = "all",
        ongoing,
        mutual,
        openToAllies,
        hasActivity,
    }: WarFilters & {
        page?: number;
        limit?: number;
    }) {
        const skip = (page - 1) * limit;
        let where: Prisma.WarWhereInput = {};
        let orderBy: Prisma.WarOrderByWithRelationInput = { started: "desc" };

        // Handle entity-based filtering
        if (entityId && entityType) {
            const entityConditions: Prisma.WarWhereInput[] = [];

            if (entityType === "corporation") {
                entityConditions.push(
                    { aggressor_corporation_id: entityId },
                    { defender_corporation_id: entityId }
                );
                // TODO: Add allies filtering when available in schema
            } else if (entityType === "alliance") {
                entityConditions.push(
                    { aggressor_alliance_id: entityId },
                    { defender_alliance_id: entityId }
                );
                // TODO: Add allies filtering when available in schema
            }

            if (entityConditions.length > 0) {
                where.OR = entityConditions;
            }
        }

        // Handle tab-specific filtering
        switch (tab) {
            case "recent":
                // Recent activity - last 30 days
                const thirtyDaysAgo = new Date();
                thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

                where.OR = [
                    ...(where.OR || []),
                    { started: { gte: thirtyDaysAgo } },
                    { finished: { gte: thirtyDaysAgo } },
                ];
                break;
            case "all":
            default:
                // All wars, default sorting
                break;
        }

        // Apply additional filters
        if (ongoing) {
            where.finished = null; // Only wars that haven't finished
        }

        if (mutual !== undefined) {
            where.mutual = mutual;
        }

        if (openToAllies !== undefined) {
            where.open_for_allies = openToAllies;
        }

        if (hasActivity) {
            // Add activity filtering - would need to check against killmail counts
            // This would require additional fields in the schema or complex queries
            where.OR = [
                ...(where.OR || []),
                { aggressor_ships_killed: { gt: 0 } },
                { defender_ships_killed: { gt: 0 } },
            ];
        }

        // Get wars and total count in parallel
        const [wars, totalCount] = await Promise.all([
            prisma.war.findMany({
                where,
                orderBy,
                skip,
                take: limit,
                include: {
                    // Include related entities if needed
                    // aggressor_alliance: true,
                    // defender_alliance: true,
                    // aggressor_corporation: true,
                    // defender_corporation: true,
                },
            }),
            prisma.war.count({ where }),
        ]);

        // Calculate pagination info
        const totalPages = Math.ceil(totalCount / limit);
        const hasNextPage = page < totalPages;
        const hasPrevPage = page > 1;

        return {
            wars,
            pagination: {
                currentPage: page,
                totalPages,
                hasNextPage,
                hasPrevPage,
                totalCount,
            },
        };
    }

    /**
     * Find war by war_id
     */
    static async findById(warId: number) {
        return await prisma.war.findUnique({
            where: { war_id: warId },
        });
    }

    /**
     * Get recent wars (last 30 days of activity)
     */
    static async getRecent(limit: number = 25) {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        return await prisma.war.findMany({
            where: {
                OR: [
                    { started: { gte: thirtyDaysAgo } },
                    { finished: { gte: thirtyDaysAgo } },
                ],
            },
            orderBy: { started: "desc" },
            take: limit,
        });
    }

    /**
     * Get ongoing wars (not finished)
     */
    static async getOngoing(limit: number = 25) {
        return await prisma.war.findMany({
            where: { finished: null },
            orderBy: { started: "desc" },
            take: limit,
        });
    }

    /**
     * Get recent wars by category (for wars/recent endpoint)
     */
    static async getRecentByCategories() {
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        // Run all queries in parallel for better performance
        const [recentOpenToAllies, recentMutual, recentOther, recentFinished] =
            await Promise.all([
                // Wars open to allies (active, not finished) - limit to 100 most recent
                prisma.war.findMany({
                    where: {
                        open_for_allies: true,
                        mutual: false,
                        finished: null,
                    },
                    orderBy: { declared: "desc" },
                    take: 100,
                }),

                // Mutual wars (active, not finished) - limit to 100 most recent
                prisma.war.findMany({
                    where: {
                        mutual: true,
                        finished: null,
                    },
                    orderBy: { declared: "desc" },
                    take: 100,
                }),

                // Other active wars (not open to allies, not mutual, not finished) - limit to 100 most recent
                prisma.war.findMany({
                    where: {
                        open_for_allies: false,
                        mutual: false,
                        finished: null,
                    },
                    orderBy: { declared: "desc" },
                    take: 100,
                }),

                // Recently finished wars (finished within last 7 days only) - limit to 50
                prisma.war.findMany({
                    where: {
                        finished: {
                            gte: sevenDaysAgo,
                        },
                    },
                    orderBy: { finished: "desc" },
                    take: 50,
                }),
            ]);

        return {
            recentOpenToAllies,
            recentMutual,
            recentOther,
            recentFinished,
        };
    }

    /**
     * Extract all entity IDs from a collection of wars
     */
    static extractEntityIds(wars: any[]) {
        const corporationIds = new Set<number>();
        const allianceIds = new Set<number>();

        for (const war of wars) {
            // Aggressor
            if (war.aggressor_corporation_id)
                corporationIds.add(war.aggressor_corporation_id);
            if (war.aggressor_alliance_id)
                allianceIds.add(war.aggressor_alliance_id);

            // Defender
            if (war.defender_corporation_id)
                corporationIds.add(war.defender_corporation_id);
            if (war.defender_alliance_id)
                allianceIds.add(war.defender_alliance_id);

            // TODO: Handle allies when available in schema
            // This would require additional tables for war allies
        }

        return {
            corporationIds: Array.from(corporationIds),
            allianceIds: Array.from(allianceIds),
        };
    }

    /**
     * Populate war entities with corporation and alliance data
     */
    static async populateWarEntities(
        wars: any[],
        corporationIds: number[],
        allianceIds: number[]
    ) {
        // Fetch entities in parallel
        const [corporations, alliances] = await Promise.all([
            corporationIds.length > 0
                ? prisma.corporation.findMany({
                      where: { corporation_id: { in: corporationIds } },
                      select: { corporation_id: true, name: true },
                  })
                : [],
            allianceIds.length > 0
                ? prisma.alliance.findMany({
                      where: { alliance_id: { in: allianceIds } },
                      select: { alliance_id: true, name: true },
                  })
                : [],
        ]);

        // Create lookup maps
        const corpMap = new Map(
            corporations.map((corp) => [corp.corporation_id, corp])
        );
        const allianceMap = new Map(
            alliances.map((alliance) => [alliance.alliance_id, alliance])
        );

        // Populate wars
        return wars.map((war) => ({
            ...war,
            aggressor: {
                corporation_id: war.aggressor_corporation_id,
                alliance_id: war.aggressor_alliance_id,
                ships_killed: war.aggressor_ships_killed,
                isk_destroyed: war.aggressor_isk_destroyed,
                corporation: war.aggressor_corporation_id
                    ? corpMap.get(war.aggressor_corporation_id) || null
                    : null,
                alliance: war.aggressor_alliance_id
                    ? allianceMap.get(war.aggressor_alliance_id) || null
                    : null,
            },
            defender: {
                corporation_id: war.defender_corporation_id,
                alliance_id: war.defender_alliance_id,
                ships_killed: war.defender_ships_killed,
                isk_destroyed: war.defender_isk_destroyed,
                corporation: war.defender_corporation_id
                    ? corpMap.get(war.defender_corporation_id) || null
                    : null,
                alliance: war.defender_alliance_id
                    ? allianceMap.get(war.defender_alliance_id) || null
                    : null,
            },
            allies: [], // TODO: Implement allies when schema is available
        }));
    }

    /**
     * Get wars involving specific entities
     */
    static async getByEntity(
        entityId: number,
        entityType: "corporation" | "alliance",
        limit: number = 25
    ) {
        let where: Prisma.WarWhereInput = {};

        if (entityType === "corporation") {
            where.OR = [
                { aggressor_corporation_id: entityId },
                { defender_corporation_id: entityId },
            ];
        } else if (entityType === "alliance") {
            where.OR = [
                { aggressor_alliance_id: entityId },
                { defender_alliance_id: entityId },
            ];
        }

        return await prisma.war.findMany({
            where,
            orderBy: { started: "desc" },
            take: limit,
        });
    }

    /**
     * Find many wars with flexible options
     */
    static async findMany(options: {
        select?: any;
        where?: any;
        skip?: number;
        take?: number;
        orderBy?: any;
    }) {
        return await prisma.war.findMany(options);
    }
}
