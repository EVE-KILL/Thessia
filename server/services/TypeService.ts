import prisma from "../../lib/prisma";

export class TypeService {
    /**
     * Find type by type_id
     */
    static async findById(typeId: number) {
        return await prisma.invType.findUnique({
            where: { type_id: typeId },
        });
    }

    /**
     * Find multiple types by type_ids
     */
    static async findByIds(typeIds: number[]) {
        return await prisma.invType.findMany({
            where: { type_id: { in: typeIds } },
        });
    }

    /**
     * Find types by group_id
     */
    static async findByGroup(groupId: number) {
        return await prisma.invType.findMany({
            where: { group_id: groupId },
        });
    }

    /**
     * Find types by category_id
     */
    static async findByCategory(categoryId: number) {
        return await prisma.invType.findMany({
            where: { category_id: categoryId },
        });
    }

    /**
     * Find multiple types by their IDs
     */
    static async findManyByIds(typeIds: number[]) {
        return await prisma.invType.findMany({
            where: {
                type_id: {
                    in: typeIds,
                },
            },
        });
    }

    /**
     * Search types by name pattern
     */
    static async searchByName(namePattern: string, limit: number = 10) {
        return await prisma.invType.findMany({
            where: {
                name: {
                    path: ["en"],
                    string_contains: namePattern,
                },
            },
            take: limit,
        });
    }

    /**
     * Get type with full details (group, category)
     */
    static async getWithDetails(typeId: number) {
        return await prisma.invType.findUnique({
            where: { type_id: typeId },
            include: {
                group: {
                    select: {
                        group_name: true,
                        category_id: true,
                    },
                },
            },
        });
    }

    /**
     * Find published types only
     */
    static async findPublished(limit?: number) {
        return await prisma.invType.findMany({
            where: { published: true },
            take: limit,
        });
    }

    /**
     * Get ship types (category_id = 6)
     */
    static async getShipTypes(limit?: number) {
        return await prisma.invType.findMany({
            where: { category_id: 6, published: true },
            take: limit,
        });
    }

    /**
     * Get drone types (category_id = 18)
     */
    static async getDroneTypes(limit?: number) {
        return await prisma.invType.findMany({
            where: { category_id: 18, published: true },
            take: limit,
        });
    }

    /**
     * Get module types (category_id = 7)
     */
    static async getModuleTypes(limit?: number) {
        return await prisma.invType.findMany({
            where: { category_id: 7, published: true },
            take: limit,
        });
    }

    /**
     * Get ammunition types (category_id = 8)
     */
    static async getAmmunitionTypes(limit?: number) {
        return await prisma.invType.findMany({
            where: { category_id: 8, published: true },
            take: limit,
        });
    }

    /**
     * Get structure types (category_id = 23)
     */
    static async getStructureTypes(limit?: number) {
        return await prisma.invType.findMany({
            where: { category_id: 23, published: true },
            take: limit,
        });
    }

    /**
     * Get sovereignty structures (used for sovereignty calculations)
     */
    static async getSovereigntyStructureTypes() {
        const structureGroupIds = [365, 1404, 1405, 1406, 1407, 1657, 2017]; // TCU, iHub, Jump Gates, etc.
        return await prisma.invType.findMany({
            where: { group_id: { in: structureGroupIds } },
        });
    }

    /**
     * Count total types
     */
    static async count(): Promise<number> {
        return await prisma.invType.count();
    }

    /**
     * Count published types
     */
    static async countPublished(): Promise<number> {
        return await prisma.invType.count({
            where: { published: true },
        });
    }

    /**
     * Get types by market group
     */
    static async findByMarketGroup(marketGroupId: number) {
        return await prisma.invType.findMany({
            where: { market_group_id: marketGroupId },
        });
    }

    /**
     * Get all ship categories (useful for filtering)
     */
    static async getShipCategories() {
        return await prisma.invType.findMany({
            where: { category_id: 6, published: true },
            distinct: ["group_id"],
            include: {
                group: true,
            },
        });
    }

    /**
     * Search types with advanced filters
     */
    static async searchAdvanced(filters: {
        name?: string;
        categoryId?: number;
        groupId?: number;
        published?: boolean;
        hasMarketGroup?: boolean;
        limit?: number;
    }) {
        const where: any = {};

        if (filters.name) {
            where.name = {
                path: ["en"],
                string_contains: filters.name,
            };
        }

        if (filters.categoryId) {
            where.category_id = filters.categoryId;
        }

        if (filters.groupId) {
            where.group_id = filters.groupId;
        }

        if (filters.published !== undefined) {
            where.published = filters.published;
        }

        if (filters.hasMarketGroup) {
            where.market_group_id = {
                not: null,
            };
        }

        return await prisma.invType.findMany({
            where,
            take: filters.limit || 50,
        });
    }
}
