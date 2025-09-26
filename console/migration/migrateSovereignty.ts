import { PrismaClient } from "@prisma/client";
import { cliLogger } from "../../server/helpers/Logger";
import { Sovereignty as MongooseSovereignty } from "../../server/models/Sovereignty";
import { MigrationHelper } from "./MigrationHelper";

const prisma = new PrismaClient();

interface MongoSovereignty {
    _id: any;
    systemId: number;
    allianceId?: number;
    corporationId?: number;
    factionId?: number;
    contested?: string;
    vulnerabilityOccupancyLevel?: number;
    vulnerableStartTime?: Date;
    vulnerableEndTime?: Date;
    createdAt?: Date;
    updatedAt?: Date;
}

export async function migrateSovereignty(
    force: boolean = false
): Promise<void> {
    cliLogger.info("Starting Sovereignty migration...");

    try {
        // Check existing data
        const existingCount = await prisma.sovereignty.count();

        if (existingCount > 0 && !force) {
            cliLogger.warn(
                `Sovereignty migration already exists (${existingCount} records). Use --force to re-run.`
            );
            return;
        }

        const totalCount = await MigrationHelper.getEstimatedCount(
            MongooseSovereignty
        );
        cliLogger.info(
            `Estimated MongoDB Sovereignty records: ${totalCount.toLocaleString()}`
        );

        if (totalCount === 0) {
            cliLogger.info("No Sovereignty records to migrate");
            return;
        }

        // Clear existing data if force migration
        if (force && existingCount > 0) {
            cliLogger.info(
                "Force migration: clearing existing Sovereignty data..."
            );
            await prisma.sovereignty.deleteMany();
        }

        const batchSize = 3000; // Sovereignty data is relatively static
        await MigrationHelper.processBatches<MongoSovereignty>(
            MongooseSovereignty,
            totalCount,
            batchSize,
            async (
                batch: MongoSovereignty[],
                batchNumber: number,
                totalBatches: number
            ) => {
                const transformedSovereignty = batch.map((sov) => ({
                    system_id: sov.systemId,
                    alliance_id: sov.allianceId || null,
                    corporation_id: sov.corporationId || null,
                    faction_id: sov.factionId || null,
                    contested: sov.contested || null,
                    vulnerability_occupancy_level:
                        sov.vulnerabilityOccupancyLevel || null,
                    vulnerable_start_time: sov.vulnerableStartTime || null,
                    vulnerable_end_time: sov.vulnerableEndTime || null,
                    created_at: sov.createdAt || new Date(),
                    updated_at: sov.updatedAt || new Date(),
                }));

                await prisma.sovereignty.createMany({
                    data: transformedSovereignty,
                    skipDuplicates: true,
                });
            },
            { batchSize, logProgress: true, skipDuplicates: true }
        );

        const finalCount = await prisma.sovereignty.count();
        cliLogger.info(
            `Sovereignty migration completed! Migrated ${finalCount.toLocaleString()} records`
        );
    } catch (error) {
        cliLogger.error(`Sovereignty migration failed: ${error}`);
        throw error;
    }
}
