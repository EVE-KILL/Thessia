import prisma from "../../lib/prisma";

export class ConfigService {
    /**
     * Get configuration value by key
     */
    static async get(key: string): Promise<any> {
        const config = await prisma.config.findUnique({
            where: { key },
        });
        return config?.value || null;
    }

    /**
     * Get configuration value by key as string
     */
    static async getString(key: string): Promise<string | null> {
        const value = await this.get(key);
        return value !== null ? String(value) : null;
    }

    /**
     * Get configuration value by key with default fallback
     */
    static async getWithDefault(key: string, defaultValue: any): Promise<any> {
        const value = await this.get(key);
        return value !== null ? value : defaultValue;
    }

    /**
     * Set configuration value
     */
    static async set(key: string, value: any) {
        return await prisma.config.upsert({
            where: { key },
            update: { value },
            create: { key, value },
        });
    }

    /**
     * Get multiple configuration values by keys
     */
    static async getMultiple(keys: string[]): Promise<Record<string, any>> {
        const configs = await prisma.config.findMany({
            where: { key: { in: keys } },
        });

        const result: Record<string, any> = {};
        for (const config of configs) {
            result[config.key] = config.value;
        }
        return result;
    }

    /**
     * Get all configuration values
     */
    static async getAll(): Promise<Record<string, any>> {
        const configs = await prisma.config.findMany();

        const result: Record<string, any> = {};
        for (const config of configs) {
            result[config.key] = config.value;
        }
        return result;
    }

    /**
     * Delete configuration by key
     */
    static async delete(key: string) {
        return await prisma.config.delete({
            where: { key },
        });
    }

    /**
     * Check if configuration key exists
     */
    static async exists(key: string): Promise<boolean> {
        const config = await prisma.config.findUnique({
            where: { key },
            select: { key: true },
        });
        return config !== null;
    }

    /**
     * Set multiple configuration values at once
     */
    static async setMultiple(configs: Record<string, any>) {
        const operations = Object.entries(configs).map(([key, value]) => ({
            where: { key },
            update: { value },
            create: { key, value },
        }));

        return await Promise.all(
            operations.map((operation) => prisma.config.upsert(operation))
        );
    }

    /**
     * Get configuration values matching a key pattern
     */
    static async getByPattern(pattern: string): Promise<Record<string, any>> {
        const configs = await prisma.config.findMany({
            where: {
                key: {
                    contains: pattern,
                    mode: "insensitive",
                },
            },
        });

        const result: Record<string, any> = {};
        for (const config of configs) {
            result[config.key] = config.value;
        }
        return result;
    }

    /**
     * Get configuration keys starting with a prefix
     */
    static async getByPrefix(prefix: string): Promise<Record<string, any>> {
        const configs = await prisma.config.findMany({
            where: {
                key: {
                    startsWith: prefix,
                },
            },
        });

        const result: Record<string, any> = {};
        for (const config of configs) {
            result[config.key] = config.value;
        }
        return result;
    }

    /**
     * Count total configuration entries
     */
    static async count(): Promise<number> {
        return await prisma.config.count();
    }
}
