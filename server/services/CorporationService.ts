import type { Prisma } from "@prisma/client";
import prisma from "../../lib/prisma";

export class CorporationService {
    /**
     * Find corporation by corporation_id
     */
    static async findById(corporationId: number) {
        return await prisma.corporation.findUnique({
            where: { corporation_id: corporationId },
        });
    }

    /**
     * Find corporations by multiple IDs
     */
    static async findByIds(corporationIds: number[]) {
        return await prisma.corporation.findMany({
            where: {
                corporation_id: { in: corporationIds },
            },
        });
    }

    /**
     * Count corporations by alliance ID
     */
    static async countByAllianceId(allianceId: number) {
        return await prisma.corporation.count({
            where: { alliance_id: allianceId },
        });
    }

    /**
     * Search corporations with pagination
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

        let where: Prisma.CorporationWhereInput = {};

        if (search) {
            const searchNumber = parseInt(search);
            if (!isNaN(searchNumber)) {
                where.corporation_id = searchNumber;
            } else {
                where.OR = [
                    { name: { contains: search, mode: "insensitive" } },
                    { ticker: { contains: search, mode: "insensitive" } },
                ];
            }
        }

        const [corporations, totalCount] = await Promise.all([
            prisma.corporation.findMany({
                where,
                orderBy: { updated_at: "desc" },
                skip,
                take: limit,
            }),
            prisma.corporation.count({ where }),
        ]);

        const totalPages = Math.ceil(totalCount / limit);
        const hasNextPage = page < totalPages;
        const hasPrevPage = page > 1;

        return {
            corporations,
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
     * Find corporations by alliance
     */
    static async findByAllianceId(allianceId: number) {
        return await prisma.corporation.findMany({
            where: { alliance_id: allianceId },
        });
    }

    /**
     * Get corporation with related data
     */
    static async findWithRelations(corporationId: number) {
        return await prisma.corporation.findUnique({
            where: { corporation_id: corporationId },
            include: {
                // Add relations when available
                // alliance: true,
                // ceo_character: true,
            },
        });
    }

    /**
     * Search corporations by various criteria
     */
    static async search(filters: {
        corporation_ids?: number[];
        alliance_ids?: number[];
        name_contains?: string;
        ticker_contains?: string;
        deleted?: boolean;
    }) {
        const where: Prisma.CorporationWhereInput = {};
        const orConditions: Prisma.CorporationWhereInput[] = [];

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

        if (filters.ticker_contains) {
            orConditions.push({
                ticker: {
                    contains: filters.ticker_contains,
                    mode: "insensitive",
                },
            });
        }

        if (orConditions.length > 0) {
            where.OR = orConditions;
        }

        if (filters.deleted !== undefined) {
            where.deleted = filters.deleted;
        }

        return await prisma.corporation.findMany({ where });
    }

    /**
     * Get the total count of all corporations
     */
    static async getTotalCount(): Promise<number> {
        return await prisma.corporation.count();
    }

    /**
     * Find many corporations with flexible options
     */
    static async findMany(options: {
        select?: any;
        where?: any;
        skip?: number;
        take?: number;
        orderBy?: any;
    }) {
        return await prisma.corporation.findMany(options);
    }
}
