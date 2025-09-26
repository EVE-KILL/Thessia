import { cliLogger } from "../../server/helpers/Logger";
import {
    MigrationCheckpoint,
    MigrationProgressTracker,
} from "./MigrationProgressTracker";

export interface MigrationProgress {
    totalCount: number;
    migratedRecords: number;
    errorCount: number;
    startTime: number;
}

export interface BatchProcessingOptions {
    batchSize: number;
    logProgress: boolean;
    skipDuplicates: boolean;
    resume: boolean;
}

export interface ResumableMigrationOptions {
    modelName: string;
    model: any;
    batchSize: number;
    processBatch: (
        batch: any[],
        batchNumber: number,
        totalBatches: number,
        checkpoint: MigrationCheckpoint
    ) => Promise<void>;
    forceRestart?: boolean;
    onProgress?: (checkpoint: MigrationCheckpoint) => void;
}

export class MigrationHelper {
    /**
     * Get estimated document count from MongoDB (much faster than exact count)
     */
    static async getEstimatedCount(model: any): Promise<number> {
        try {
            // Use estimatedDocumentCount for speed - it's much faster than countDocuments
            return await model.estimatedDocumentCount();
        } catch (error) {
            cliLogger.warn(`Could not get estimated count: ${error}`);
            // Fallback to regular count with timeout
            try {
                return await model.countDocuments().maxTimeMS(5000);
            } catch (fallbackError) {
                cliLogger.error(`Count operations failed: ${fallbackError}`);
                throw new Error("Unable to determine document count");
            }
        }
    }

    /**
     * Calculate and log migration progress with ETA
     */
    static logProgress(
        progress: MigrationProgress,
        batchSize: number,
        additionalRecords: number = 0,
        additionalLabel: string = ""
    ) {
        const { totalCount, migratedRecords, startTime } = progress;

        // Calculate time estimates
        const elapsedTime = Date.now() - startTime;
        const avgTimePerRecord = elapsedTime / migratedRecords;
        const remainingRecords = totalCount - migratedRecords;
        const estimatedRemainingTime = avgTimePerRecord * remainingRecords;
        const estimatedFinishTime = new Date(
            Date.now() + estimatedRemainingTime
        );
        const progressPercent = ((migratedRecords / totalCount) * 100).toFixed(
            1
        );

        cliLogger.info(
            `Migrated batch: ${batchSize} records${
                additionalLabel
                    ? `, ${additionalRecords} ${additionalLabel}`
                    : ""
            }`
        );
        cliLogger.info(
            `Progress: ${migratedRecords.toLocaleString()}/${totalCount.toLocaleString()} (${progressPercent}%)`
        );

        if (additionalRecords > 0) {
            cliLogger.info(
                `${additionalLabel}: ${additionalRecords.toLocaleString()}, ETA: ${estimatedFinishTime.toLocaleTimeString()}`
            );
        } else {
            cliLogger.info(`ETA: ${estimatedFinishTime.toLocaleTimeString()}`);
        }
    }

    /**
     * Log batch processing information
     */
    static logBatchInfo(
        batchNumber: number,
        totalBatches: number,
        skip: number,
        batchSize: number,
        totalCount: number
    ) {
        const progressPercent = ((batchNumber / totalBatches) * 100).toFixed(1);
        const endRecord = Math.min(skip + batchSize, totalCount);

        cliLogger.info(
            `Processing batch ${batchNumber}/${totalBatches} (${progressPercent}%) - Records ${skip.toLocaleString()}-${endRecord.toLocaleString()}`
        );
    }

    /**
     * Perform batch processing with error handling and progress tracking
     */
    static async processBatches<T>(
        model: any,
        totalCount: number,
        batchSize: number,
        processBatch: (
            batch: T[],
            batchNumber: number,
            totalBatches: number
        ) => Promise<void>,
        options: BatchProcessingOptions = {
            batchSize: 1000,
            logProgress: true,
            skipDuplicates: true,
            resume: false,
        }
    ): Promise<{ migratedRecords: number; errorCount: number }> {
        let skip = 0;
        let migratedRecords = 0;
        let errorCount = 0;
        const totalBatches = Math.ceil(totalCount / batchSize);
        const startTime = Date.now();

        while (skip < totalCount) {
            try {
                const batchNumber = Math.floor(skip / batchSize) + 1;

                if (options.logProgress) {
                    this.logBatchInfo(
                        batchNumber,
                        totalBatches,
                        skip,
                        batchSize,
                        totalCount
                    );
                }

                // Fetch batch from MongoDB
                const batch = (await model
                    .find({})
                    .skip(skip)
                    .limit(batchSize)
                    .lean()
                    .exec()) as T[];

                if (batch.length === 0) {
                    cliLogger.info("No more records to process");
                    break;
                }

                // Process the batch
                await processBatch(batch, batchNumber, totalBatches);

                migratedRecords += batch.length;
            } catch (batchError) {
                errorCount++;
                const batchNumber = Math.floor(skip / batchSize) + 1;
                cliLogger.error(`Error in batch ${batchNumber}: ${batchError}`);
            }

            skip += batchSize;
        }

        return { migratedRecords, errorCount };
    }

    /**
     * Normalize field values for comparison (handles common data type differences)
     */
    static normalizeValue(value: any, field: string): any {
        if (value === undefined) return null;

        // Handle common field normalizations
        switch (field) {
            case "faction_id":
            case "executor_corporation_id":
                return value === 0 ? null : value;
            case "deleted":
                return value === null || value === undefined ? false : value;
            default:
                return value;
        }
    }

    /**
     * Compare date values with tolerance for timestamp differences
     */
    static compareDates(
        mongoDate: Date | null,
        postgresDate: Date | null,
        toleranceMs: number = 1000
    ): boolean {
        if (!mongoDate && !postgresDate) return true;
        if (!mongoDate || !postgresDate) return false;

        const mongoTime = new Date(mongoDate).getTime();
        const postgresTime = new Date(postgresDate).getTime();
        const diff = Math.abs(mongoTime - postgresTime);

        return diff <= toleranceMs;
    }

    /**
     * Perform resumable batch processing with progress tracking
     */
    static async processResumableMigration(
        options: ResumableMigrationOptions
    ): Promise<{ migratedRecords: number; errorCount: number }> {
        const {
            modelName,
            model,
            batchSize,
            processBatch,
            forceRestart,
            onProgress,
        } = options;

        // Clear progress if force restart is requested
        if (forceRestart) {
            await MigrationProgressTracker.clearProgress(modelName);
            cliLogger.info(
                `Force restart: Cleared existing progress for ${modelName}`
            );
        }

        // Try to load existing progress
        let checkpoint = await MigrationProgressTracker.loadProgress(modelName);
        let totalCount: number;

        if (checkpoint) {
            // Resume existing migration
            totalCount = checkpoint.totalRecords;
            const stats =
                MigrationProgressTracker.calculateResumeStats(checkpoint);

            cliLogger.info(
                `=== RESUMING MIGRATION FOR ${modelName.toUpperCase()} ===`
            );
            cliLogger.info(`Progress: ${stats.progressPercent}% complete`);
            cliLogger.info(
                `Records: ${checkpoint.processedRecords.toLocaleString()}/${totalCount.toLocaleString()}`
            );
            cliLogger.info(`Time Elapsed: ${stats.timeElapsed}`);
            cliLogger.info(
                `Estimated Remaining: ${stats.estimatedTimeRemaining}`
            );
            cliLogger.info(
                `Starting from skip position: ${checkpoint.lastSkipValue}`
            );
            cliLogger.info("===");
        } else {
            // Start new migration
            totalCount = await this.getEstimatedCount(model);
            checkpoint = await MigrationProgressTracker.createCheckpoint(
                modelName,
                totalCount,
                batchSize
            );

            cliLogger.info(
                `=== STARTING NEW MIGRATION FOR ${modelName.toUpperCase()} ===`
            );
            cliLogger.info(`Total records: ${totalCount.toLocaleString()}`);
            cliLogger.info(`Batch size: ${batchSize.toLocaleString()}`);
            cliLogger.info("===");
        }

        let skip = checkpoint.lastSkipValue;
        let totalMigratedRecords = checkpoint.processedRecords;
        let totalErrorCount = checkpoint.errorCount;
        const totalBatches = Math.ceil(totalCount / batchSize);

        // Continue processing from where we left off
        while (skip < totalCount) {
            try {
                const batchNumber = Math.floor(skip / batchSize) + 1;

                // Progress logging
                this.logBatchInfo(
                    batchNumber,
                    totalBatches,
                    skip,
                    batchSize,
                    totalCount
                );

                // Fetch batch from MongoDB
                const batch = await model
                    .find({})
                    .skip(skip)
                    .limit(batchSize)
                    .lean()
                    .exec();

                if (batch.length === 0) {
                    cliLogger.info("No more records to process");
                    break;
                }

                // Process the batch
                await processBatch(
                    batch,
                    batchNumber,
                    totalBatches,
                    checkpoint
                );

                // Update progress
                const lastId =
                    batch[batch.length - 1]._id || batch[batch.length - 1].id;
                await MigrationProgressTracker.updateProgress(
                    checkpoint,
                    batch.length,
                    skip + batchSize,
                    lastId
                );

                totalMigratedRecords += batch.length;

                // Call progress callback if provided
                if (onProgress) {
                    onProgress(checkpoint);
                }

                // Progress logging with ETA
                const stats =
                    MigrationProgressTracker.calculateResumeStats(checkpoint);
                cliLogger.info(
                    `Progress: ${stats.progressPercent.toFixed(1)}% | Speed: ${
                        stats.recordsPerSecond
                    } records/sec | ETA: ${stats.estimatedTimeRemaining}`
                );
            } catch (batchError) {
                totalErrorCount++;
                const batchNumber = Math.floor(skip / batchSize) + 1;

                cliLogger.error(`Error in batch ${batchNumber}: ${batchError}`);

                // Update progress with error count
                await MigrationProgressTracker.updateProgress(
                    checkpoint,
                    0, // No records processed in this batch
                    skip + batchSize,
                    undefined,
                    1 // Add one error
                );

                // Continue with next batch instead of stopping
                cliLogger.warn(`Continuing with next batch after error...`);
            }

            skip += batchSize;
        }

        // Mark migration as complete
        await MigrationProgressTracker.markComplete(modelName);

        const finalStats =
            MigrationProgressTracker.calculateResumeStats(checkpoint);
        cliLogger.info(
            `=== MIGRATION COMPLETE FOR ${modelName.toUpperCase()} ===`
        );
        cliLogger.info(
            `Total records migrated: ${totalMigratedRecords.toLocaleString()}`
        );
        cliLogger.info(`Total errors: ${totalErrorCount}`);
        cliLogger.info(`Total time: ${finalStats.timeElapsed}`);
        cliLogger.info(
            `Average speed: ${finalStats.recordsPerSecond} records/sec`
        );
        cliLogger.info("===");

        return {
            migratedRecords: totalMigratedRecords,
            errorCount: totalErrorCount,
        };
    }
}
