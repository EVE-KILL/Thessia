import type { Prisma } from "@prisma/client";
import prisma from "../../lib/prisma";

export class AllianceService {
    /**
     * Get alliance by ID
     */
    static async findById(allianceId: number) {
        return await prisma.alliance.findUnique({
            where: { alliance_id: allianceId },
        });
    }

    /**
     * Get alliance by unique identifier (support both alliance_id and internal id)
     */
    static async findOne(filter: { alliance_id?: number; id?: number }) {
        const where: any = {};
        if (filter.alliance_id) where.alliance_id = filter.alliance_id;
        if (filter.id) where.id = filter.id;

        return await prisma.alliance.findFirst({ where });
    }

    /**
     * Search alliances with pagination - used by admin interface
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

        // Build filter conditions
        let where: Prisma.AllianceWhereInput = {};

        if (search) {
            const searchNumber = parseInt(search);
            if (!isNaN(searchNumber)) {
                // Search by alliance_id if it's a number
                where.alliance_id = searchNumber;
            } else {
                // Text search on name or ticker
                where.OR = [
                    { name: { contains: search, mode: "insensitive" } },
                    { ticker: { contains: search, mode: "insensitive" } },
                ];
            }
        }

        // Get data and total count in parallel
        const [alliances, totalCount] = await Promise.all([
            prisma.alliance.findMany({
                where,
                orderBy: { updated_at: "desc" },
                skip,
                take: limit,
                select: {
                    alliance_id: true,
                    name: true,
                    ticker: true,
                    executor_corporation_id: true,
                    creator_id: true,
                    creator_corporation_id: true,
                    date_founded: true,
                    deleted: true,
                    created_at: true,
                    updated_at: true,
                },
            }),
            prisma.alliance.count({ where }),
        ]);

        // Calculate pagination info
        const totalPages = Math.ceil(totalCount / limit);
        const hasNextPage = page < totalPages;
        const hasPrevPage = page > 1;

        return {
            alliances: alliances.map((alliance) => ({
                alliance_id: alliance.alliance_id,
                name: alliance.name,
                ticker: alliance.ticker,
                executor_corporation_id: alliance.executor_corporation_id,
                creator_id: alliance.creator_id,
                creator_corporation_id: alliance.creator_corporation_id,
                date_founded: alliance.date_founded,
                deleted: alliance.deleted,
                createdAt: alliance.created_at,
                updatedAt: alliance.updated_at,
            })),
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
     * Find alliances by multiple criteria (for war filtering)
     */
    static async findByIds(allianceIds: number[]) {
        return await prisma.alliance.findMany({
            where: {
                alliance_id: { in: allianceIds },
            },
        });
    }

    /**
     * Get estimated document count (for pagination when no filters applied)
     */
    static async getEstimatedCount() {
        // PostgreSQL doesn't have estimatedDocumentCount like MongoDB
        // Use a fast approximate count for large tables
        const result = await prisma.$queryRaw<[{ count: bigint }]>`
            SELECT reltuples::BIGINT as count
            FROM pg_class
            WHERE relname = 'alliances'
        `;
        return Number(result[0]?.count || 0);
    }

    /**
     * Search alliances with flexible filtering (similar to MongoDB $or queries)
     */
    static async search(filters: {
        alliance_ids?: number[];
        corporation_ids?: number[];
        name_contains?: string;
        ticker_contains?: string;
        deleted?: boolean;
    }) {
        const where: Prisma.AllianceWhereInput = {};
        const orConditions: Prisma.AllianceWhereInput[] = [];

        if (filters.alliance_ids?.length) {
            orConditions.push({ alliance_id: { in: filters.alliance_ids } });
        }

        if (filters.corporation_ids?.length) {
            orConditions.push({
                executor_corporation_id: { in: filters.corporation_ids },
            });
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

        return await prisma.alliance.findMany({ where });
    }

    /**
     * Get alliance with related corporation data (for detailed views)
     */
    static async findWithRelations(allianceId: number) {
        return await prisma.alliance.findUnique({
            where: { alliance_id: allianceId },
            include: {
                // Add any relations when they're available in schema
                // corporations: true,
                // executor_corporation: true,
            },
        });
    }

    /**
     * Get the total count of all alliances
     */
    static async getTotalCount(): Promise<number> {
        return await prisma.alliance.count();
    }

    /**
     * Find all alliance IDs (for index endpoint)
     */
    static async findAllIds() {
        return await prisma.alliance.findMany({
            select: {
                alliance_id: true,
            },
        });
    }
}
