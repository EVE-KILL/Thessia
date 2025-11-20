import type { Prisma } from "@prisma/client";
import prisma from "../../lib/prisma";

export class BattleService {
    /**
     * Find battle by battle_id
     */
    static async findById(battleId: number) {
        return await prisma.battle.findUnique({
            where: { battle_id: battleId },
        });
    }

    /**
     * Find battle by battle_id with all relations
     */
    static async findWithRelations(battleId: number) {
        return await prisma.battle.findUnique({
            where: { battle_id: battleId },
            include: {
                systems: true,
                alliances: true,
                corporations: true,
                killmails: true,
            },
        });
    }

    /**
     * Search battles with pagination and filters
     */
    static async searchWithPagination({
        filter,
        search,
        page = 1,
        limit = 50,
    }: {
        filter?: string;
        search?: string;
        page?: number;
        limit?: number;
    }) {
        const skip = (page - 1) * limit;
        const where: Prisma.BattleWhereInput = {};

        // Apply filter for custom battles
        if (filter === "custom") {
            where.custom = true;
        }

        // Apply search for systems/regions
        if (search && search.length >= 2) {
            where.OR = [
                // Search in systems
                {
                    systems: {
                        some: {
                            system_name: {
                                contains: search,
                                mode: "insensitive",
                            },
                        },
                    },
                },
                {
                    systems: {
                        some: {
                            region_name: {
                                contains: search,
                                mode: "insensitive",
                            },
                        },
                    },
                },
            ];
        }

        const [battles, total] = await Promise.all([
            prisma.battle.findMany({
                where,
                select: {
                    battle_id: true,
                    custom: true,
                    start_time: true,
                    end_time: true,
                    duration_ms: true,
                    systems: {
                        select: {
                            system_id: true,
                            system_name: true,
                            region_name: true,
                        },
                    },
                    total_ships_lost: true,
                    total_isk_lost: true,
                    sides: true,
                },
                orderBy: { start_time: "desc" },
                skip,
                take: limit,
            }),
            prisma.battle.count({ where }),
        ]);

        return {
            data: battles,
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
        };
    }

    /**
     * Create a new battle
     */
    static async create(battleData: Prisma.BattleCreateInput) {
        return await prisma.battle.create({
            data: battleData,
        });
    }

    /**
     * Count battles by character involvement
     */
    static async countByCharacter(characterId: number) {
        return await prisma.battle.count({
            where: {
                characters_involved: {
                    has: characterId,
                },
            },
        });
    }

    /**
     * Count battles by alliance involvement
     */
    static async countByAlliance(allianceId: number) {
        return await prisma.battle.count({
            where: {
                alliances_involved: {
                    has: allianceId,
                },
            },
        });
    }

    /**
     * Count battles by corporation involvement
     */
    static async countByCorporation(corporationId: number) {
        return await prisma.battle.count({
            where: {
                corporations_involved: {
                    has: corporationId,
                },
            },
        });
    }

    /**
     * Count battles by system
     */
    static async countBySystem(systemId: number) {
        return await prisma.battle.count({
            where: {
                systems: {
                    some: {
                        system_id: systemId,
                    },
                },
            },
        });
    }

    /**
     * Count battles by region
     */
    static async countByRegion(regionId: number) {
        return await prisma.battle.count({
            where: {
                region_id: regionId,
            },
        });
    }

    /**
     * Get battles by character with pagination
     */
    static async findByCharacter(characterId: number, page = 1, limit = 50) {
        const skip = (page - 1) * limit;

        const [battles, total] = await Promise.all([
            prisma.battle.findMany({
                where: {
                    characters_involved: {
                        has: characterId,
                    },
                },
                select: {
                    battle_id: true,
                    custom: true,
                    start_time: true,
                    end_time: true,
                    duration_ms: true,
                    systems: true,
                    total_ships_lost: true,
                    total_isk_lost: true,
                    sides: true,
                },
                orderBy: { start_time: "desc" },
                skip,
                take: limit,
            }),
            this.countByCharacter(characterId),
        ]);

        return {
            data: battles,
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
        };
    }

    /**
     * Get battles by alliance with pagination
     */
    static async findByAlliance(allianceId: number, page = 1, limit = 50) {
        const skip = (page - 1) * limit;

        const [battles, total] = await Promise.all([
            prisma.battle.findMany({
                where: {
                    alliances_involved: {
                        has: allianceId,
                    },
                },
                select: {
                    battle_id: true,
                    custom: true,
                    start_time: true,
                    end_time: true,
                    duration_ms: true,
                    systems: true,
                    total_ships_lost: true,
                    total_isk_lost: true,
                    sides: true,
                },
                orderBy: { start_time: "desc" },
                skip,
                take: limit,
            }),
            this.countByAlliance(allianceId),
        ]);

        return {
            data: battles,
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
        };
    }

    /**
     * Get battles by corporation with pagination
     */
    static async findByCorporation(
        corporationId: number,
        page = 1,
        limit = 50
    ) {
        const skip = (page - 1) * limit;

        const [battles, total] = await Promise.all([
            prisma.battle.findMany({
                where: {
                    corporations_involved: {
                        has: corporationId,
                    },
                },
                select: {
                    battle_id: true,
                    custom: true,
                    start_time: true,
                    end_time: true,
                    duration_ms: true,
                    systems: true,
                    total_ships_lost: true,
                    total_isk_lost: true,
                    sides: true,
                },
                orderBy: { start_time: "desc" },
                skip,
                take: limit,
            }),
            this.countByCorporation(corporationId),
        ]);

        return {
            data: battles,
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
        };
    }

    /**
     * Get battles by system with pagination
     */
    static async findBySystem(systemId: number, page = 1, limit = 50) {
        const skip = (page - 1) * limit;

        const [battles, total] = await Promise.all([
            prisma.battle.findMany({
                where: {
                    systems: {
                        some: {
                            system_id: systemId,
                        },
                    },
                },
                select: {
                    battle_id: true,
                    custom: true,
                    start_time: true,
                    end_time: true,
                    duration_ms: true,
                    systems: {
                        select: {
                            system_id: true,
                            system_name: true,
                            region_name: true,
                        },
                    },
                    total_ships_lost: true,
                    total_isk_lost: true,
                    sides: true,
                },
                orderBy: { start_time: "desc" },
                skip,
                take: limit,
            }),
            this.countBySystem(systemId),
        ]);

        return {
            data: battles,
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
        };
    }

    /**
     * Get battles by region with pagination
     */
    static async findByRegion(regionId: number, page = 1, limit = 50) {
        const skip = (page - 1) * limit;

        const [battles, total] = await Promise.all([
            prisma.battle.findMany({
                where: {
                    region_id: regionId,
                },
                select: {
                    battle_id: true,
                    custom: true,
                    start_time: true,
                    end_time: true,
                    duration_ms: true,
                    systems: {
                        select: {
                            system_id: true,
                            system_name: true,
                            region_name: true,
                        },
                    },
                    total_ships_lost: true,
                    total_isk_lost: true,
                    sides: true,
                },
                orderBy: { start_time: "desc" },
                skip,
                take: limit,
            }),
            this.countByRegion(regionId),
        ]);

        return {
            data: battles,
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
        };
    }
}
