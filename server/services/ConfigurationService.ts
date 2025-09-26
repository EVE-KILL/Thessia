import prisma from "../../lib/prisma";

export class ConfigurationService {
    /**
     * Find configurations by entity criteria
     */
    static async findByEntityCriteria({
        characterId,
        corporationId,
        allianceId,
    }: {
        characterId?: number;
        corporationId?: number;
        allianceId?: number;
    }) {
        // Build the where conditions - we want configs that match any of the provided criteria
        // OR are global (all: true)
        const where = {
            OR: [
                { all: true }, // Always include global configurations
                ...(characterId ? [{ character_id: characterId }] : []),
                ...(corporationId ? [{ corporation_id: corporationId }] : []),
                ...(allianceId ? [{ alliance_id: allianceId }] : []),
            ],
        };

        return await prisma.configuration.findMany({
            where,
            orderBy: [
                { all: 'desc' }, // Global configs first
                { created_at: 'desc' },
            ],
        });
    }

    /**
     * Find configuration by ID
     */
    static async findById(id: number) {
        return await prisma.configuration.findUnique({
            where: { id },
        });
    }

    /**
     * Find all global configurations
     */
    static async findGlobal() {
        return await prisma.configuration.findMany({
            where: { all: true },
            orderBy: { created_at: 'desc' },
        });
    }

    /**
     * Create a new configuration
     */
    static async create(data: {
        name: string;
        value: any;
        description?: string;
        all?: boolean;
        character_id?: number;
        corporation_id?: number;
        alliance_id?: number;
    }) {
        return await prisma.configuration.create({
            data: {
                ...data,
                value: JSON.stringify(data.value),
            },
        });
    }

    /**
     * Update a configuration
     */
    static async update(id: number, data: {
        name?: string;
        value?: any;
        description?: string;
        all?: boolean;
        character_id?: number;
        corporation_id?: number;
        alliance_id?: number;
    }) {
        const updateData = { ...data };
        if (data.value !== undefined) {
            updateData.value = JSON.stringify(data.value);
        }

        return await prisma.configuration.update({
            where: { id },
            data: updateData,
        });
    }

    /**
     * Delete a configuration
     */
    static async delete(id: number) {
        return await prisma.configuration.delete({
            where: { id },
        });
    }
}