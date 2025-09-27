import prisma from "../../lib/prisma";

export class RaceService {
    /**
     * Find race by race_id
     */
    static async findById(raceId: number) {
        return await prisma.race.findUnique({
            where: { race_id: raceId },
        });
    }

    /**
     * Find multiple races by race_ids
     */
    static async findByIds(raceIds: number[]) {
        return await prisma.race.findMany({
            where: { race_id: { in: raceIds } },
        });
    }

    /**
     * Find all races
     */
    static async findAll() {
        return await prisma.race.findMany({
            orderBy: { race_name: "asc" },
        });
    }

    /**
     * Search races by name pattern
     */
    static async searchByName(namePattern: string, limit: number = 10) {
        return await prisma.race.findMany({
            where: {
                race_name: {
                    contains: namePattern,
                    mode: "insensitive",
                },
            },
            take: limit,
            orderBy: { race_name: "asc" },
        });
    }

    /**
     * Get race with all bloodlines
     */
    static async getWithBloodlines(raceId: number) {
        return await prisma.race.findUnique({
            where: { race_id: raceId },
            include: {
                bloodlines: {
                    orderBy: { bloodline_name: "asc" },
                },
            },
        });
    }

    /**
     * Get all races with bloodline counts
     */
    static async getAllWithCounts() {
        return await prisma.race.findMany({
            include: {
                _count: {
                    select: {
                        bloodlines: true,
                    },
                },
            },
            orderBy: { race_name: "asc" },
        });
    }

    /**
     * Count total races
     */
    static async count(): Promise<number> {
        return await prisma.race.count();
    }

    /**
     * Get playable races (races with bloodlines)
     */
    static async getPlayableRaces() {
        return await prisma.race.findMany({
            where: {
                bloodlines: {
                    some: {},
                },
            },
            include: {
                bloodlines: {
                    orderBy: { bloodline_name: "asc" },
                },
            },
            orderBy: { race_name: "asc" },
        });
    }
}
