import prisma from "../../lib/prisma";

export class ConstellationService {
    /**
     * Find constellation by constellation_id
     */
    static async findById(constellationId: number) {
        return await prisma.constellation.findUnique({
            where: { constellation_id: constellationId },
        });
    }

    /**
     * Find multiple constellations by constellation_ids
     */
    static async findByIds(constellationIds: number[]) {
        return await prisma.constellation.findMany({
            where: { constellation_id: { in: constellationIds } },
        });
    }

    /**
     * Find constellations by region_id
     */
    static async findByRegion(regionId: number) {
        return await prisma.constellation.findMany({
            where: { region_id: regionId },
            orderBy: { constellation_name: "asc" },
        });
    }

    /**
     * Search constellations by name pattern
     */
    static async searchByName(namePattern: string, limit: number = 10) {
        return await prisma.constellation.findMany({
            where: {
                constellation_name: {
                    contains: namePattern,
                    mode: "insensitive",
                },
            },
            take: limit,
            orderBy: { constellation_name: "asc" },
        });
    }

    /**
     * Get constellation with region information
     */
    static async getWithRegion(constellationId: number) {
        return await prisma.constellation.findUnique({
            where: { constellation_id: constellationId },
            include: {
                region: true,
            },
        });
    }

    /**
     * Get constellation with all solar systems
     */
    static async getWithSystems(constellationId: number) {
        return await prisma.constellation.findUnique({
            where: { constellation_id: constellationId },
            include: {
                solar_systems: {
                    orderBy: { system_name: "asc" },
                },
            },
        });
    }

    /**
     * Get constellation with full hierarchy (region and systems)
     */
    static async getWithFullHierarchy(constellationId: number) {
        return await prisma.constellation.findUnique({
            where: { constellation_id: constellationId },
            include: {
                region: true,
                solar_systems: {
                    orderBy: { system_name: "asc" },
                },
            },
        });
    }

    /**
     * Find constellations by faction
     */
    static async findByFaction(factionId: number) {
        return await prisma.constellation.findMany({
            where: { faction_id: factionId },
            orderBy: { constellation_name: "asc" },
        });
    }

    /**
     * Get constellation statistics
     */
    static async getConstellationStatistics(constellationId: number) {
        const constellation = await prisma.constellation.findUnique({
            where: { constellation_id: constellationId },
            include: {
                _count: {
                    select: {
                        solar_systems: true,
                    },
                },
                region: {
                    select: {
                        region_name: true,
                    },
                },
            },
        });

        return constellation;
    }

    /**
     * Search constellations with advanced filters
     */
    static async searchAdvanced(filters: {
        name?: string;
        regionId?: number;
        factionId?: number;
        hasHighSec?: boolean;
        hasLowSec?: boolean;
        hasNullSec?: boolean;
        limit?: number;
    }) {
        const where: any = {};

        if (filters.name) {
            where.constellation_name = {
                contains: filters.name,
                mode: "insensitive",
            };
        }

        if (filters.regionId) {
            where.region_id = filters.regionId;
        }

        if (filters.factionId) {
            where.faction_id = filters.factionId;
        }

        if (filters.hasHighSec) {
            where.solar_systems = {
                some: {
                    security: { gte: 0.5 },
                },
            };
        }

        if (filters.hasLowSec) {
            where.solar_systems = {
                some: {
                    security: {
                        gte: 0.1,
                        lt: 0.5,
                    },
                },
            };
        }

        if (filters.hasNullSec) {
            where.solar_systems = {
                some: {
                    security: { lte: 0.0 },
                },
            };
        }

        return await prisma.constellation.findMany({
            where,
            take: filters.limit || 50,
            orderBy: { constellation_name: "asc" },
            include: {
                region: {
                    select: {
                        region_name: true,
                    },
                },
            },
        });
    }

    /**
     * Get all constellations with system counts
     */
    static async getAllWithCounts() {
        return await prisma.constellation.findMany({
            include: {
                _count: {
                    select: {
                        solar_systems: true,
                    },
                },
                region: {
                    select: {
                        region_name: true,
                    },
                },
            },
            orderBy: { constellation_name: "asc" },
        });
    }

    /**
     * Get constellations in region with system counts
     */
    static async getInRegionWithCounts(regionId: number) {
        return await prisma.constellation.findMany({
            where: { region_id: regionId },
            include: {
                _count: {
                    select: {
                        solar_systems: true,
                    },
                },
            },
            orderBy: { constellation_name: "asc" },
        });
    }

    /**
     * Count total constellations
     */
    static async count(): Promise<number> {
        return await prisma.constellation.count();
    }

    /**
     * Count constellations by region
     */
    static async countByRegion(regionId: number): Promise<number> {
        return await prisma.constellation.count({
            where: { region_id: regionId },
        });
    }

    /**
     * Count constellations by faction
     */
    static async countByFaction(factionId: number): Promise<number> {
        return await prisma.constellation.count({
            where: { faction_id: factionId },
        });
    }

    /**
     * Get constellation security distribution
     */
    static async getSecurityDistribution(constellationId: number) {
        const systems = await prisma.solarSystem.findMany({
            where: { constellation_id: constellationId },
            select: { security: true, security_class: true },
        });

        const distribution = {
            highSec: systems.filter((s) => (s.security || 0) >= 0.5).length,
            lowSec: systems.filter(
                (s) => (s.security || 0) >= 0.1 && (s.security || 0) < 0.5
            ).length,
            nullSec: systems.filter((s) => (s.security || 0) <= 0.0).length,
            wormhole: systems.filter((s) => s.security_class?.startsWith("wh"))
                .length,
            total: systems.length,
        };

        return distribution;
    }

    /**
     * Find constellations with wormhole systems
     */
    static async findWithWormholes() {
        return await prisma.constellation.findMany({
            where: {
                solar_systems: {
                    some: {
                        security_class: {
                            startsWith: "wh",
                        },
                    },
                },
            },
            orderBy: { constellation_name: "asc" },
        });
    }

    /**
     * Get most active constellations by system count
     */
    static async getMostPopulated(limit: number = 10) {
        return await prisma.constellation.findMany({
            take: limit,
            include: {
                _count: {
                    select: {
                        solar_systems: true,
                    },
                },
                region: {
                    select: {
                        region_name: true,
                    },
                },
            },
            orderBy: {
                solar_systems: {
                    _count: "desc",
                },
            },
        });
    }

    /**
     * Find constellation by name (case-insensitive)
     */
    static async findByName(name: string) {
        return await prisma.constellation.findFirst({
            where: { 
                constellation_name: {
                    equals: name,
                    mode: "insensitive",
                },
            },
        });
    }
}
