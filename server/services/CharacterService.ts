import type { Prisma } from "@prisma/client";
import prisma from "../../lib/prisma";

export class CharacterService {
    /**
     * Find character by character_id
     */
    static async findById(characterId: number) {
        return await prisma.character.findUnique({
            where: { character_id: characterId },
        });
    }

    /**
     * Find character with relations (corporation, alliance, etc.)
     */
    static async findWithRelations(characterId: number) {
        return await prisma.character.findUnique({
            where: { character_id: characterId },
            include: {
                corporation: {
                    select: {
                        corporation_id: true,
                        name: true,
                        ticker: true,
                    },
                },
                alliance: {
                    select: {
                        alliance_id: true,
                        name: true,
                        ticker: true,
                    },
                },
                achievements: true,
                history: {
                    orderBy: { start_date: "desc" },
                    take: 10,
                    include: {
                        corporation: {
                            select: {
                                name: true,
                                ticker: true,
                            },
                        },
                    },
                },
            },
        });
    }

    /**
     * Find characters by multiple IDs
     */
    static async findByIds(characterIds: number[]) {
        return await prisma.character.findMany({
            where: {
                character_id: { in: characterIds },
            },
        });
    }

    /**
     * Search characters with pagination
     */
    static async searchWithPagination({
        search,
        page = 1,
        limit = 25,
    }: {
        search?: string;
        page?: number;
        limit?: number;
    }) {
        const skip = (page - 1) * limit;

        let where: Prisma.CharacterWhereInput = {};

        if (search) {
            const searchNumber = parseInt(search);
            if (!isNaN(searchNumber)) {
                where.character_id = searchNumber;
            } else {
                where.name = { contains: search, mode: "insensitive" };
            }
        }

        const [characters, totalCount] = await Promise.all([
            prisma.character.findMany({
                where,
                orderBy: { updated_at: "desc" },
                skip,
                take: limit,
                include: {
                    corporation: {
                        select: { name: true, ticker: true },
                    },
                    alliance: {
                        select: { name: true, ticker: true },
                    },
                },
            }),
            prisma.character.count({ where }),
        ]);

        const totalPages = Math.ceil(totalCount / limit);
        const hasNextPage = page < totalPages;
        const hasPrevPage = page > 1;

        return {
            characters,
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
     * Find characters by corporation (with optional pagination)
     */
    static async findByCorporationId(
        corporationId: number,
        page?: number,
        limit?: number
    ) {
        if (page !== undefined && limit !== undefined) {
            const skip = (page - 1) * limit;

            const [members, total] = await Promise.all([
                prisma.character.findMany({
                    where: { corporation_id: corporationId },
                    select: {
                        character_id: true,
                        name: true,
                    },
                    skip,
                    take: limit,
                }),
                prisma.character.count({
                    where: { corporation_id: corporationId },
                }),
            ]);

            return {
                members,
                total,
                page,
                limit,
                pageCount: Math.ceil(total / limit),
                count: members.length,
            };
        } else {
            // Return all with relations for backward compatibility
            return await prisma.character.findMany({
                where: { corporation_id: corporationId },
                include: {
                    corporation: {
                        select: { name: true, ticker: true },
                    },
                },
            });
        }
    }

    /**
     * Find characters by alliance (with optional pagination)
     */
    static async findByAllianceId(
        allianceId: number,
        page?: number,
        limit?: number
    ) {
        if (page !== undefined && limit !== undefined) {
            const skip = (page - 1) * limit;

            const [members, total] = await Promise.all([
                prisma.character.findMany({
                    where: { alliance_id: allianceId },
                    select: {
                        character_id: true,
                        name: true,
                    },
                    skip,
                    take: limit,
                }),
                prisma.character.count({
                    where: { alliance_id: allianceId },
                }),
            ]);

            return {
                members,
                total,
                page,
                limit,
                pageCount: Math.ceil(total / limit),
                count: members.length,
            };
        } else {
            // Return all with relations for backward compatibility
            return await prisma.character.findMany({
                where: { alliance_id: allianceId },
                include: {
                    corporation: {
                        select: { name: true, ticker: true },
                    },
                    alliance: {
                        select: { name: true, ticker: true },
                    },
                },
            });
        }
    }

    /**
     * Get character history by character ID
     */
    static async getHistory(characterId: number, page = 1, limit = 20) {
        const skip = (page - 1) * limit;

        const totalCount = await prisma.characterHistory.count({
            where: { character_id: characterId },
        });

        const history = await prisma.characterHistory.findMany({
            where: { character_id: characterId },
            orderBy: { updated_at: "desc" },
            skip,
            take: limit,
        });

        return {
            data: history,
            total: totalCount,
            page,
            limit,
            totalPages: Math.ceil(totalCount / limit),
        };
    }

    /**
     * Get character IDs with pagination
     */
    static async getCharacterIds(page = 1, limit = 100000) {
        const skip = (page - 1) * limit;

        const characters = await prisma.character.findMany({
            select: { character_id: true },
            skip,
            take: limit,
        });

        return characters.map((character) => character.character_id);
    }

    /**
     * Count characters by alliance ID
     */
    static async countByAllianceId(allianceId: number) {
        return await prisma.character.count({
            where: { alliance_id: allianceId },
        });
    }

    /**
     * Count characters by corporation ID
     */
    static async countByCorporationId(corporationId: number) {
        return await prisma.character.count({
            where: { corporation_id: corporationId },
        });
    }

    /**
     * Get total count of all characters
     */
    static async getTotalCount() {
        return await prisma.character.count();
    }

    /**
     * Find multiple characters by IDs with relations
     */
    static async findManyByIds(characterIds: number[]) {
        return await prisma.character.findMany({
            where: {
                character_id: {
                    in: characterIds,
                },
            },
            select: {
                character_id: true,
                name: true,
                corporation_id: true,
                alliance_id: true,
            },
        });
    }

    /**
     * Update character activity timestamp
     */
    static async updateLastActive(characterId: number) {
        return await prisma.character.update({
            where: { character_id: characterId },
            data: {
                last_active: new Date(),
                updated_at: new Date(),
            },
        });
    }

    /**
     * Search characters by various criteria
     */
    static async search(filters: {
        character_ids?: number[];
        corporation_ids?: number[];
        alliance_ids?: number[];
        name_contains?: string;
        deleted?: boolean;
        last_active_after?: Date;
    }) {
        const where: Prisma.CharacterWhereInput = {};
        const orConditions: Prisma.CharacterWhereInput[] = [];

        if (filters.character_ids?.length) {
            orConditions.push({ character_id: { in: filters.character_ids } });
        }

        if (filters.corporation_ids?.length) {
            orConditions.push({
                corporation_id: { in: filters.corporation_ids },
            });
        }

        if (filters.alliance_ids?.length) {
            orConditions.push({ alliance_id: { in: filters.alliance_ids } });
        }

        if (filters.name_contains) {
            orConditions.push({
                name: { contains: filters.name_contains, mode: "insensitive" },
            });
        }

        if (orConditions.length > 0) {
            where.OR = orConditions;
        }

        if (filters.deleted !== undefined) {
            where.deleted = filters.deleted;
        }

        if (filters.last_active_after) {
            where.last_active = { gte: filters.last_active_after };
        }

        return await prisma.character.findMany({
            where,
            include: {
                corporation: {
                    select: { name: true, ticker: true },
                },
                alliance: {
                    select: { name: true, ticker: true },
                },
            },
        });
    }
}
