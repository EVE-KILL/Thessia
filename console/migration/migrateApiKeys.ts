import { PrismaClient } from "@prisma/client";
import { cliLogger } from "../../server/helpers/Logger";
import { ApiKeys as MongooseApiKeys } from "../../server/models/ApiKeys";
import { MigrationHelper } from "./MigrationHelper";

const prisma = new PrismaClient();

interface MongoApiKey {
    _id: any;
    name: string;
    key: string;
    description?: string;
    active?: boolean;
    lastUsed?: Date;
    createdBy: number;
    createdAt?: Date;
    updatedAt?: Date;
}

export async function migrateApiKeys(force: boolean = false): Promise<void> {
    cliLogger.info("Starting API Keys migration...");

    try {
        // Check existing data
        const existingCount = await prisma.apiKey.count();

        if (existingCount > 0 && !force) {
            cliLogger.warn(
                `API Keys migration already exists (${existingCount} records). Use --force to re-run.`
            );
            return;
        }

        const totalCount = await MigrationHelper.getEstimatedCount(
            MongooseApiKeys
        );
        cliLogger.info(
            `Estimated MongoDB API Keys records: ${totalCount.toLocaleString()}`
        );

        if (totalCount === 0) {
            cliLogger.info("No API Keys records to migrate");
            return;
        }

        // Clear existing data if force migration
        if (force && existingCount > 0) {
            cliLogger.info(
                "Force migration: clearing existing API Keys data..."
            );
            await prisma.apiKey.deleteMany();
        }

        const batchSize = 1000;
        await MigrationHelper.processBatches<MongoApiKey>(
            MongooseApiKeys,
            totalCount,
            batchSize,
            async (
                batch: MongoApiKey[],
                batchNumber: number,
                totalBatches: number
            ) => {
                const transformedApiKeys = batch.map((apiKey) => ({
                    name: apiKey.name,
                    key: apiKey.key,
                    description: apiKey.description || null,
                    active: apiKey.active ?? true,
                    last_used: apiKey.lastUsed || null,
                    created_by: apiKey.createdBy,
                    created_at: apiKey.createdAt || new Date(),
                    updated_at: apiKey.updatedAt || new Date(),
                }));

                await prisma.apiKey.createMany({
                    data: transformedApiKeys,
                    skipDuplicates: true,
                });
            },
            {
                batchSize,
                logProgress: true,
                skipDuplicates: true,
                resume: false,
            }
        );

        const finalCount = await prisma.apiKey.count();
        cliLogger.info(
            `API Keys migration completed! Migrated ${finalCount.toLocaleString()} records`
        );
    } catch (error) {
        cliLogger.error(`API Keys migration failed: ${error}`);
        throw error;
    }
}
