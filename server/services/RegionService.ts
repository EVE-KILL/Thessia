import prisma from "../../lib/prisma";

export class RegionService {
    /**
     * Find region by region_id
     */
    static async findById(regionId: number) {
        return await prisma.region.findUnique({
            where: { region_id: regionId },
        });
    }

    /**
     * Find multiple regions by region_ids
     */
    static async findByIds(regionIds: number[]) {
        return await prisma.region.findMany({
            where: { region_id: { in: regionIds } },
        });
    }

    /**
     * Find all regions
     */
    static async findAll() {
        return await prisma.region.findMany({
            orderBy: { region_name: "asc" },
        });
    }

    /**
     * Search regions by name pattern
     */
    static async searchByName(namePattern: string, limit: number = 10) {
        return await prisma.region.findMany({
            where: {
                region_name: {
                    contains: namePattern,
                    mode: "insensitive",
                },
            },
            take: limit,
            orderBy: { region_name: "asc" },
        });
    }

    /**
     * Find region by exact name (case-insensitive)
     */
    static async findByName(regionName: string) {
        return await prisma.region.findFirst({
            where: {
                region_name: {
                    equals: regionName,
                    mode: "insensitive",
                },
            },
        });
    }

    /**
     * Get region with all constellations
     */
    static async getWithConstellations(regionId: number) {
        return await prisma.region.findUnique({
            where: { region_id: regionId },
            include: {
                constellations: {
                    orderBy: { constellation_name: "asc" },
                },
            },
        });
    }

    /**
     * Get region with all systems
     */
    static async getWithSystems(regionId: number) {
        return await prisma.region.findUnique({
            where: { region_id: regionId },
            include: {
                solarSystems: {
                    orderBy: { system_name: "asc" },
                },
            },
        });
    }

    /**
     * Get region with full hierarchy (constellations and systems)
     */
    static async getWithFullHierarchy(regionId: number) {
        return await prisma.region.findUnique({
            where: { region_id: regionId },
            include: {
                constellations: {
                    orderBy: { constellation_name: "asc" },
                    include: {
                        solarSystems: {
                            orderBy: { system_name: "asc" },
                        },
                    },
                },
            },
        });
    }

    /**
     * Find regions by faction
     */
    static async findByFaction(factionId: number) {
        return await prisma.region.findMany({
            where: { faction_id: factionId },
            orderBy: { region_name: "asc" },
        });
    }

    /**
     * Get high-sec regions (regions with high-sec systems)
     */
    static async getHighSecRegions() {
        return await prisma.region.findMany({
            where: {
                solarSystems: {
                    some: {
                        security: {
                            gte: 0.5,
                        },
                    },
                },
            },
            orderBy: { region_name: "asc" },
        });
    }

    /**
     * Get null-sec regions (regions with only null-sec systems)
     */
    static async getNullSecRegions() {
        return await prisma.region.findMany({
            where: {
                solarSystems: {
                    every: {
                        security: {
                            lte: 0.0,
                        },
                    },
                },
            },
            orderBy: { region_name: "asc" },
        });
    }

    /**
     * Get wormhole regions
     */
    static async getWormholeRegions() {
        return await prisma.region.findMany({
            where: {
                solarSystems: {
                    some: {
                        security_class: {
                            startsWith: "wh",
                        },
                    },
                },
            },
            orderBy: { region_name: "asc" },
        });
    }

    /**
     * Get region statistics
     */
    static async getRegionStatistics(regionId: number) {
        const region = await prisma.region.findUnique({
            where: { region_id: regionId },
            include: {
                _count: {
                    select: {
                        constellations: true,
                        solarSystems: true,
                    },
                },
            },
        });

        return region;
    }

    /**
     * Search regions with advanced filters
     */
    static async searchAdvanced(filters: {
        name?: string;
        factionId?: number;
        hasHighSec?: boolean;
        hasLowSec?: boolean;
        hasNullSec?: boolean;
        hasWormholes?: boolean;
        limit?: number;
    }) {
        const where: any = {};

        if (filters.name) {
            where.region_name = {
                contains: filters.name,
                mode: "insensitive",
            };
        }

        if (filters.factionId) {
            where.faction_id = filters.factionId;
        }

        if (filters.hasHighSec) {
            where.solarSystems = {
                some: {
                    security: { gte: 0.5 },
                },
            };
        }

        if (filters.hasLowSec) {
            where.solarSystems = {
                some: {
                    security: {
                        gte: 0.1,
                        lt: 0.5,
                    },
                },
            };
        }

        if (filters.hasNullSec) {
            where.solarSystems = {
                some: {
                    security: { lte: 0.0 },
                },
            };
        }

        if (filters.hasWormholes) {
            where.solarSystems = {
                some: {
                    security_class: {
                        startsWith: "wh",
                    },
                },
            };
        }

        return await prisma.region.findMany({
            where,
            take: filters.limit || 50,
            orderBy: { region_name: "asc" },
        });
    }

    /**
     * Get regions with system counts
     */
    static async getAllWithCounts() {
        return await prisma.region.findMany({
            include: {
                _count: {
                    select: {
                        constellations: true,
                        solarSystems: true,
                    },
                },
            },
            orderBy: { region_name: "asc" },
        });
    }

    /**
     * Get most active regions by system activity
     */
    static async getMostActiveRegions(limit: number = 10) {
        // This would require aggregating system activity data
        // For now, just return regions ordered by name
        return await prisma.region.findMany({
            take: limit,
            orderBy: { region_name: "asc" },
            include: {
                _count: {
                    select: {
                        solarSystems: true,
                    },
                },
            },
        });
    }

    /**
     * Count total regions
     */
    static async count(): Promise<number> {
        return await prisma.region.count();
    }

    /**
     * Count regions by faction
     */
    static async countByFaction(factionId: number): Promise<number> {
        return await prisma.region.count({
            where: { faction_id: factionId },
        });
    }

    /**
     * Get region security distribution
     */
    static async getSecurityDistribution(regionId: number) {
        const systems = await prisma.solarSystem.findMany({
            where: { region_id: regionId },
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
}
