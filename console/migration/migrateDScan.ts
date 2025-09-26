import { PrismaClient } from "@prisma/client";
import { cliLogger } from "../../server/helpers/Logger";
import { DScan as MongooseDScan } from "../../server/models/DScan";
import { MigrationHelper } from "./MigrationHelper";

const prisma = new PrismaClient();

interface MongoDScan {
    _id: any;
    scanId: string;
    characterId?: number;
    systemId?: number;
    scanData: any[];
    expiresAt: Date;
    createdAt?: Date;
    updatedAt?: Date;
}

export async function migrateDScan(force: boolean = false): Promise<void> {
    cliLogger.info("Starting DScan migration...");

    try {
        // Check existing data
        const existingCount = await prisma.dScan.count();

        if (existingCount > 0 && !force) {
            cliLogger.warn(
                `DScan migration already exists (${existingCount} records). Use --force to re-run.`
            );
            return;
        }

        const totalCount = await MigrationHelper.getEstimatedCount(
            MongooseDScan
        );
        cliLogger.info(
            `Estimated MongoDB DScan records: ${totalCount.toLocaleString()}`
        );

        if (totalCount === 0) {
            cliLogger.info("No DScan records to migrate");
            return;
        }

        // Clear existing data if force migration
        if (force && existingCount > 0) {
            cliLogger.info("Force migration: clearing existing DScan data...");
            await prisma.dScan.deleteMany();
        }

        const batchSize = 2000; // DScan records can be numerous but small
        await MigrationHelper.processBatches<MongoDScan>(
            MongooseDScan,
            totalCount,
            batchSize,
            async (
                batch: MongoDScan[],
                batchNumber: number,
                totalBatches: number
            ) => {
                const transformedDScans = batch.map((dscan) => ({
                    scan_id: dscan.scanId,
                    character_id: dscan.characterId || null,
                    system_id: dscan.systemId || null,
                    scan_data: JSON.parse(JSON.stringify(dscan.scanData || [])),
                    expires_at: dscan.expiresAt,
                    created_at: dscan.createdAt || new Date(),
                    updated_at: dscan.updatedAt || new Date(),
                }));

                await prisma.dScan.createMany({
                    data: transformedDScans,
                    skipDuplicates: true,
                });
            },
            { batchSize, logProgress: true, skipDuplicates: true }
        );

        const finalCount = await prisma.dScan.count();
        cliLogger.info(
            `DScan migration completed! Migrated ${finalCount.toLocaleString()} records`
        );
    } catch (error) {
        cliLogger.error(`DScan migration failed: ${error}`);
        throw error;
    }
}
