import prisma from "../../lib/prisma";

export class FactionService {
    /**
     * Find faction by faction_id
     */
    static async findById(factionId: number) {
        return await prisma.faction.findUnique({
            where: { faction_id: factionId },
        });
    }

    /**
     * Find multiple factions by faction_ids
     */
    static async findByIds(factionIds: number[]) {
        return await prisma.faction.findMany({
            where: { faction_id: { in: factionIds } },
        });
    }

    /**
     * Find all factions
     */
    static async findAll() {
        return await prisma.faction.findMany({
            orderBy: { name: "asc" },
        });
    }

    /**
     * Search factions by name pattern
     */
    static async searchByName(namePattern: string, limit: number = 10) {
        return await prisma.faction.findMany({
            where: {
                name: {
                    contains: namePattern,
                    mode: "insensitive",
                },
            },
            take: limit,
            orderBy: { name: "asc" },
        });
    }

    /**
     * Get faction with all controlled regions
     */
    static async getWithRegions(factionId: number) {
        return await prisma.faction.findUnique({
            where: { faction_id: factionId },
            include: {
                regions: {
                    orderBy: { region_name: "asc" },
                },
            },
        });
    }

    /**
     * Get faction with all controlled solar systems
     */
    static async getWithSolarSystems(factionId: number) {
        return await prisma.faction.findUnique({
            where: { faction_id: factionId },
            include: {
                solar_systems: {
                    orderBy: { system_name: "asc" },
                },
            },
        });
    }

    /**
     * Get faction with all controlled constellations
     */
    static async getWithConstellations(factionId: number) {
        return await prisma.faction.findUnique({
            where: { faction_id: factionId },
            include: {
                constellations: {
                    orderBy: { constellation_name: "asc" },
                },
            },
        });
    }

    /**
     * Get faction with full territorial control
     */
    static async getWithFullTerritory(factionId: number) {
        return await prisma.faction.findUnique({
            where: { faction_id: factionId },
            include: {
                regions: {
                    orderBy: { region_name: "asc" },
                },
                constellations: {
                    orderBy: { constellation_name: "asc" },
                },
                solar_systems: {
                    orderBy: { system_name: "asc" },
                },
            },
        });
    }

    /**
     * Get faction statistics
     */
    static async getFactionStatistics(factionId: number) {
        const faction = await prisma.faction.findUnique({
            where: { faction_id: factionId },
            include: {
                _count: {
                    select: {
                        regions: true,
                        constellations: true,
                        solar_systems: true,
                    },
                },
            },
        });

        return faction;
    }

    /**
     * Get all factions with territory counts
     */
    static async getAllWithCounts() {
        return await prisma.faction.findMany({
            include: {
                _count: {
                    select: {
                        regions: true,
                        constellations: true,
                        solar_systems: true,
                    },
                },
            },
            orderBy: { name: "asc" },
        });
    }

    /**
     * Find factions that control regions
     */
    static async findWithRegions() {
        return await prisma.faction.findMany({
            where: {
                regions: {
                    some: {},
                },
            },
            include: {
                _count: {
                    select: {
                        regions: true,
                    },
                },
            },
            orderBy: { name: "asc" },
        });
    }

    /**
     * Find factions by sovereignty type (empire, pirate, etc.)
     */
    static async findBySovereigntyType(hasTerritory: boolean = true) {
        if (hasTerritory) {
            return await prisma.faction.findMany({
                where: {
                    OR: [
                        { regions: { some: {} } },
                        { solar_systems: { some: {} } },
                    ],
                },
                orderBy: { name: "asc" },
            });
        } else {
            return await prisma.faction.findMany({
                where: {
                    AND: [
                        { regions: { none: {} } },
                        { solar_systems: { none: {} } },
                    ],
                },
                orderBy: { name: "asc" },
            });
        }
    }

    /**
     * Get empire factions (major territorial control)
     */
    static async getEmpireFactions() {
        return await prisma.faction.findMany({
            where: {
                regions: {
                    some: {},
                },
            },
            include: {
                _count: {
                    select: {
                        regions: true,
                        solar_systems: true,
                    },
                },
            },
            orderBy: {
                regions: {
                    _count: "desc",
                },
            },
        });
    }

    /**
     * Get pirate factions (no territorial control or limited)
     */
    static async getPirateFactions() {
        return await prisma.faction.findMany({
            where: {
                regions: {
                    none: {},
                },
            },
            orderBy: { name: "asc" },
        });
    }

    /**
     * Search factions with advanced filters
     */
    static async searchAdvanced(filters: {
        name?: string;
        hasRegions?: boolean;
        hasSolarSystems?: boolean;
        minRegions?: number;
        maxRegions?: number;
        limit?: number;
    }) {
        const where: any = {};

        if (filters.name) {
            where.name = {
                contains: filters.name,
                mode: "insensitive",
            };
        }

        if (filters.hasRegions === true) {
            where.regions = { some: {} };
        } else if (filters.hasRegions === false) {
            where.regions = { none: {} };
        }

        if (filters.hasSolarSystems === true) {
            where.solar_systems = { some: {} };
        } else if (filters.hasSolarSystems === false) {
            where.solar_systems = { none: {} };
        }

        return await prisma.faction.findMany({
            where,
            take: filters.limit || 50,
            orderBy: { name: "asc" },
            include: {
                _count: {
                    select: {
                        regions: true,
                        constellations: true,
                        solar_systems: true,
                    },
                },
            },
        });
    }

    /**
     * Count total factions
     */
    static async count(): Promise<number> {
        return await prisma.faction.count();
    }

    /**
     * Count empire factions (with regions)
     */
    static async countEmpireFactions(): Promise<number> {
        return await prisma.faction.count({
            where: {
                regions: {
                    some: {},
                },
            },
        });
    }

    /**
     * Count pirate factions (without regions)
     */
    static async countPirateFactions(): Promise<number> {
        return await prisma.faction.count({
            where: {
                regions: {
                    none: {},
                },
            },
        });
    }

    /**
     * Get faction territorial distribution
     */
    static async getTerritorialDistribution() {
        const factions = await this.getAllWithCounts();

        return factions
            .map((faction) => ({
                factionId: faction.faction_id,
                name: faction.name,
                regions: faction._count.regions,
                constellations: faction._count.constellations,
                solarSystems: faction._count.solar_systems,
                totalTerritory:
                    faction._count.regions +
                    faction._count.constellations +
                    faction._count.solar_systems,
            }))
            .sort((a, b) => b.totalTerritory - a.totalTerritory);
    }

    /**
     * Get the total count of all factions
     */
    static async getTotalCount(): Promise<number> {
        return await prisma.faction.count();
    }
}
