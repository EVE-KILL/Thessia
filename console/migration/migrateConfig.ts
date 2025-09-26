import { PrismaClient } from "@prisma/client";
import { cliLogger } from "../../server/helpers/Logger";
import { Config as MongooseConfig } from "../../server/models/Config";
import { MigrationHelper } from "./MigrationHelper";

const prisma = new PrismaClient();

interface MongoConfig {
    _id: any;
    key: string;
    value: any;
    createdAt?: Date;
    updatedAt?: Date;
}

export async function migrateConfig(force: boolean = false): Promise<void> {
    cliLogger.info("Starting Config migration...");

    try {
        // Check existing data
        const existingCount = await prisma.config.count();

        if (existingCount > 0 && !force) {
            cliLogger.warn(
                `Config migration already exists (${existingCount} records). Use --force to re-run.`
            );
            return;
        }

        const totalCount = await MigrationHelper.getEstimatedCount(
            MongooseConfig
        );
        cliLogger.info(
            `Estimated MongoDB Config records: ${totalCount.toLocaleString()}`
        );

        if (totalCount === 0) {
            cliLogger.info("No Config records to migrate");
            return;
        }

        // Clear existing data if force migration
        if (force && existingCount > 0) {
            cliLogger.info("Force migration: clearing existing Config data...");
            await prisma.config.deleteMany();
        }

        const batchSize = 1000;
        await MigrationHelper.processBatches<MongoConfig>(
            MongooseConfig,
            totalCount,
            batchSize,
            async (
                batch: MongoConfig[],
                batchNumber: number,
                totalBatches: number
            ) => {
                const transformedConfigs = batch.map((config) => ({
                    key: config.key,
                    value: JSON.parse(JSON.stringify(config.value)), // Ensure proper JSON serialization
                    created_at: config.createdAt || new Date(),
                    updated_at: config.updatedAt || new Date(),
                }));

                await prisma.config.createMany({
                    data: transformedConfigs,
                    skipDuplicates: true,
                });
            },
            { batchSize, logProgress: true, skipDuplicates: true }
        );

        const finalCount = await prisma.config.count();
        cliLogger.info(
            `Config migration completed! Migrated ${finalCount.toLocaleString()} records`
        );
    } catch (error) {
        cliLogger.error(`Config migration failed: ${error}`);
        throw error;
    }
}
