import prisma from "../../lib/prisma";

export class SystemService {
    /**
     * Find solar system by system_id
     */
    static async findById(systemId: number) {
        return await prisma.solarSystem.findUnique({
            where: { system_id: systemId },
        });
    }

    /**
     * Find multiple solar systems by system_ids
     */
    static async findByIds(systemIds: number[]) {
        return await prisma.solarSystem.findMany({
            where: { system_id: { in: systemIds } },
        });
    }

    /**
     * Find solar systems by constellation_id
     */
    static async findByConstellation(constellationId: number) {
        return await prisma.solarSystem.findMany({
            where: { constellation_id: constellationId },
            orderBy: { system_name: "asc" },
        });
    }

    /**
     * Find solar systems by region_id
     */
    static async findByRegion(regionId: number) {
        return await prisma.solarSystem.findMany({
            where: { region_id: regionId },
            orderBy: { system_name: "asc" },
        });
    }

    /**
     * Search solar systems by name pattern
     */
    static async searchByName(namePattern: string, limit: number = 10) {
        return await prisma.solarSystem.findMany({
            where: {
                system_name: {
                    contains: namePattern,
                    mode: "insensitive",
                },
            },
            take: limit,
            orderBy: { system_name: "asc" },
        });
    }

    /**
     * Get system with full hierarchy (region, constellation)
     */
    static async getWithHierarchy(systemId: number) {
        return await prisma.solarSystem.findUnique({
            where: { system_id: systemId },
            include: {
                constellation: {
                    include: {
                        region: true,
                    },
                },
                factions: true,
            },
        });
    }

    /**
     * Find systems by security status range
     */
    static async findBySecurityRange(minSecurity: number, maxSecurity: number) {
        return await prisma.solarSystem.findMany({
            where: {
                security: {
                    gte: minSecurity,
                    lte: maxSecurity,
                },
            },
            orderBy: { system_name: "asc" },
        });
    }

    /**
     * Get high-sec systems (security >= 0.5)
     */
    static async getHighSecSystems() {
        return await this.findBySecurityRange(0.5, 1.0);
    }

    /**
     * Get low-sec systems (0.1 <= security < 0.5)
     */
    static async getLowSecSystems() {
        return await this.findBySecurityRange(0.1, 0.49);
    }

    /**
     * Get null-sec systems (security <= 0.0)
     */
    static async getNullSecSystems() {
        return await prisma.solarSystem.findMany({
            where: {
                security: {
                    lte: 0.0,
                },
            },
            orderBy: { system_name: "asc" },
        });
    }

    /**
     * Get wormhole systems (special security class)
     */
    static async getWormholeSystems() {
        return await prisma.solarSystem.findMany({
            where: {
                security_class: {
                    startsWith: "wh",
                },
            },
            orderBy: { system_name: "asc" },
        });
    }

    /**
     * Find systems by faction
     */
    static async findByFaction(factionId: number) {
        return await prisma.solarSystem.findMany({
            where: { faction_id: factionId },
            orderBy: { system_name: "asc" },
        });
    }

    /**
     * Get system activity data
     */
    static async getSystemActivity(systemId: number) {
        const system = await prisma.solarSystem.findUnique({
            where: { system_id: systemId },
            select: {
                system_id: true,
                system_name: true,
                activity: true,
                kills: true,
            },
        });

        return system;
    }

    /**
     * Search systems with advanced filters
     */
    static async searchAdvanced(filters: {
        name?: string;
        regionId?: number;
        constellationId?: number;
        minSecurity?: number;
        maxSecurity?: number;
        factionId?: number;
        securityClass?: string;
        limit?: number;
    }) {
        const where: any = {};

        if (filters.name) {
            where.system_name = {
                contains: filters.name,
                mode: "insensitive",
            };
        }

        if (filters.regionId) {
            where.region_id = filters.regionId;
        }

        if (filters.constellationId) {
            where.constellation_id = filters.constellationId;
        }

        if (
            filters.minSecurity !== undefined &&
            filters.maxSecurity !== undefined
        ) {
            where.security = {
                gte: filters.minSecurity,
                lte: filters.maxSecurity,
            };
        } else if (filters.minSecurity !== undefined) {
            where.security = { gte: filters.minSecurity };
        } else if (filters.maxSecurity !== undefined) {
            where.security = { lte: filters.maxSecurity };
        }

        if (filters.factionId) {
            where.faction_id = filters.factionId;
        }

        if (filters.securityClass) {
            where.security_class = filters.securityClass;
        }

        return await prisma.solarSystem.findMany({
            where,
            take: filters.limit || 50,
            orderBy: { system_name: "asc" },
            include: {
                region: {
                    select: {
                        region_name: true,
                    },
                },
                constellation: {
                    select: {
                        constellation_name: true,
                    },
                },
            },
        });
    }

    /**
     * Get systems with recent activity
     */
    static async getActiveSystemsInRegion(
        regionId: number,
        limit: number = 20
    ) {
        return await prisma.solarSystem.findMany({
            where: {
                region_id: regionId,
                // For Json fields, we can't easily filter for non-null without raw queries
                // So we'll just return systems and let the caller filter by activity
            },
            take: limit,
            orderBy: { system_name: "asc" },
        });
    }

    /**
     * Count total systems
     */
    static async count(): Promise<number> {
        return await prisma.solarSystem.count();
    }

    /**
     * Count systems by region
     */
    static async countByRegion(regionId: number): Promise<number> {
        return await prisma.solarSystem.count({
            where: { region_id: regionId },
        });
    }

    /**
     * Get system statistics by security band
     */
    static async getSecurityStatistics() {
        const result = await prisma.solarSystem.groupBy({
            by: ["security_class"],
            _count: {
                system_id: true,
            },
        });

        return result.map((item) => ({
            securityClass: item.security_class,
            systemCount: item._count.system_id,
        }));
    }

    /**
     * Find nearest systems to coordinates
     */
    static async findNearestSystems(
        x: number,
        y: number,
        z: number,
        limit: number = 10
    ) {
        // This would require a more complex query with distance calculation
        // For now, return systems ordered by system_name
        return await prisma.solarSystem.findMany({
            where: {
                x: { not: null },
                y: { not: null },
                z: { not: null },
            },
            take: limit,
            orderBy: { system_name: "asc" },
        });
    }
}
