import { PrismaClient } from "@prisma/client";
import { cliLogger } from "../../server/helpers/Logger";
import { Prices as MongoosePrices } from "../../server/models/Prices";
import { MigrationHelper } from "./MigrationHelper";
import {
    type MigrationCheckpoint,
    MigrationProgressTracker,
} from "./MigrationProgressTracker";

const prisma = new PrismaClient();

interface MongoPrice {
    type_id: number;
    average?: number;
    highest?: number;
    lowest?: number;
    region_id: number;
    order_count?: number;
    volume?: number;
    date: Date;
    createdAt?: Date;
    updatedAt?: Date;
}

/**
 * Process a batch of prices and insert into PostgreSQL
 */
async function processPriceBatch(
    prices: MongoPrice[],
    batchNumber: number,
    totalBatches: number,
    checkpoint: MigrationCheckpoint
): Promise<void> {
    try {
        const operations = prices.map((mongoPrice) => ({
            type_id: mongoPrice.type_id,
            average: mongoPrice.average || null,
            highest: mongoPrice.highest || null,
            lowest: mongoPrice.lowest || null,
            region_id: mongoPrice.region_id,
            order_count: mongoPrice.order_count || null,
            volume: mongoPrice.volume || null,
            date: mongoPrice.date,
            created_at: mongoPrice.createdAt || new Date(),
            updated_at: mongoPrice.updatedAt || new Date(),
        }));

        await prisma.price.createMany({
            data: operations,
            skipDuplicates: true,
        });

        // Update checkpoint
        checkpoint.processedRecords += operations.length;
        checkpoint.lastUpdateTime = Date.now();

        await MigrationProgressTracker.saveProgress(checkpoint);

        cliLogger.info(
            `✅ Batch ${batchNumber}/${totalBatches}: ${operations.length} prices processed`
        );
    } catch (error) {
        cliLogger.error(`❌ Database error in batch ${batchNumber}: ${error}`);
        checkpoint.errorCount += prices.length;
        throw error;
    }
}

export async function migratePrices(
    forceRestart: boolean = false
): Promise<void> {
    try {
        cliLogger.info(
            "🚀 Starting Prices migration with resumable pattern..."
        );

        // Use the resumable migration helper
        await MigrationHelper.processResumableMigration({
            modelName: "prices",
            model: MongoosePrices,
            batchSize: 10000, // Large batch size for simple data
            processBatch: processPriceBatch,
            forceRestart,
            onProgress: (checkpoint) => {
                const progressPercent = (
                    (checkpoint.processedRecords / checkpoint.totalRecords) *
                    100
                ).toFixed(1);
                const elapsedTime = Date.now() - checkpoint.startTime;
                const avgTimePerRecord =
                    elapsedTime / checkpoint.processedRecords;
                const remainingRecords =
                    checkpoint.totalRecords - checkpoint.processedRecords;
                const estimatedRemainingTime =
                    avgTimePerRecord * remainingRecords;
                const estimatedFinishTime = new Date(
                    Date.now() + estimatedRemainingTime
                );

                cliLogger.info(
                    `📈 Progress: ${checkpoint.processedRecords.toLocaleString()}/${checkpoint.totalRecords.toLocaleString()} ` +
                        `(${progressPercent}%) - ETA: ${estimatedFinishTime.toLocaleTimeString()}`
                );

                if (checkpoint.errorCount > 0) {
                    cliLogger.warn(
                        `⚠️  Errors encountered: ${checkpoint.errorCount}`
                    );
                }
            },
        });

        cliLogger.info("🎉 Prices migration completed successfully!");
    } catch (error) {
        cliLogger.error(`❌ Migration failed: ${error}`);
        throw error;
    } finally {
        await prisma.$disconnect();
    }
}

// Export for CLI usage
if (require.main === module) {
    const forceRestart = process.argv.includes("--force-restart");
    migratePrices(forceRestart)
        .then(() => {
            cliLogger.info("✅ Migration script completed");
            process.exit(0);
        })
        .catch((error) => {
            cliLogger.error(`❌ Migration script failed: ${error}`);
            process.exit(1);
        });
}
