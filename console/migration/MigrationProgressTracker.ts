import fs from "fs/promises";
import path from "path";
import { cliLogger } from "../../server/helpers/Logger";

export interface MigrationCheckpoint {
    modelName: string;
    totalRecords: number;
    processedRecords: number;
    lastProcessedId?: string | number;
    lastSkipValue: number;
    startTime: number;
    lastUpdateTime: number;
    batchSize: number;
    errorCount: number;
    isComplete: boolean;
}

export class MigrationProgressTracker {
    private static readonly PROGRESS_DIR = path.join(
        process.cwd(),
        ".migration-progress"
    );

    /**
     * Ensure progress directory exists
     */
    private static async ensureProgressDir(): Promise<void> {
        try {
            await fs.mkdir(this.PROGRESS_DIR, { recursive: true });
        } catch (error) {
            // Directory already exists or other error - ignore
        }
    }

    /**
     * Get progress file path for a model
     */
    private static getProgressFilePath(modelName: string): string {
        return path.join(this.PROGRESS_DIR, `${modelName.toLowerCase()}.json`);
    }

    /**
     * Save migration progress to file
     */
    static async saveProgress(checkpoint: MigrationCheckpoint): Promise<void> {
        await this.ensureProgressDir();
        const filePath = this.getProgressFilePath(checkpoint.modelName);

        try {
            await fs.writeFile(filePath, JSON.stringify(checkpoint, null, 2));
            cliLogger.debug(
                `Progress saved: ${checkpoint.processedRecords}/${checkpoint.totalRecords} records`
            );
        } catch (error) {
            cliLogger.warn(`Failed to save progress: ${error}`);
        }
    }

    /**
     * Load migration progress from file
     */
    static async loadProgress(
        modelName: string
    ): Promise<MigrationCheckpoint | null> {
        await this.ensureProgressDir();
        const filePath = this.getProgressFilePath(modelName);

        try {
            const data = await fs.readFile(filePath, "utf-8");
            const checkpoint = JSON.parse(data) as MigrationCheckpoint;

            if (checkpoint.isComplete) {
                cliLogger.info(
                    `Migration for ${modelName} is already complete`
                );
                return null;
            }

            cliLogger.info(
                `Found existing progress: ${checkpoint.processedRecords}/${checkpoint.totalRecords} records processed`
            );
            cliLogger.info(
                `Last checkpoint: Skip=${checkpoint.lastSkipValue}, Errors=${checkpoint.errorCount}`
            );

            return checkpoint;
        } catch (error) {
            // No progress file exists or is corrupted
            cliLogger.debug(`No existing progress found for ${modelName}`);
            return null;
        }
    }

    /**
     * Create initial checkpoint for a migration
     */
    static async createCheckpoint(
        modelName: string,
        totalRecords: number,
        batchSize: number
    ): Promise<MigrationCheckpoint> {
        const checkpoint: MigrationCheckpoint = {
            modelName,
            totalRecords,
            processedRecords: 0,
            lastSkipValue: 0,
            startTime: Date.now(),
            lastUpdateTime: Date.now(),
            batchSize,
            errorCount: 0,
            isComplete: false,
        };

        await this.saveProgress(checkpoint);
        cliLogger.info(`Created new migration checkpoint for ${modelName}`);

        return checkpoint;
    }

    /**
     * Update progress checkpoint
     */
    static async updateProgress(
        checkpoint: MigrationCheckpoint,
        processedInBatch: number,
        newSkipValue: number,
        lastProcessedId?: string | number,
        errorCount: number = 0
    ): Promise<void> {
        checkpoint.processedRecords += processedInBatch;
        checkpoint.lastSkipValue = newSkipValue;
        checkpoint.lastUpdateTime = Date.now();
        checkpoint.errorCount += errorCount;

        if (lastProcessedId !== undefined) {
            checkpoint.lastProcessedId = lastProcessedId;
        }

        // Mark as complete if we've processed all records
        if (checkpoint.processedRecords >= checkpoint.totalRecords) {
            checkpoint.isComplete = true;
        }

        await this.saveProgress(checkpoint);
    }

    /**
     * Mark migration as complete and clean up progress file
     */
    static async markComplete(modelName: string): Promise<void> {
        const filePath = this.getProgressFilePath(modelName);

        try {
            // Update the checkpoint to mark as complete
            const checkpoint = await this.loadProgress(modelName);
            if (checkpoint) {
                checkpoint.isComplete = true;
                await this.saveProgress(checkpoint);
            }

            cliLogger.info(`Migration for ${modelName} marked as complete`);
        } catch (error) {
            cliLogger.warn(`Failed to mark migration complete: ${error}`);
        }
    }

    /**
     * Clear progress for a model (useful for restarting)
     */
    static async clearProgress(modelName: string): Promise<void> {
        const filePath = this.getProgressFilePath(modelName);

        try {
            await fs.unlink(filePath);
            cliLogger.info(`Progress cleared for ${modelName}`);
        } catch (error) {
            // File doesn't exist - that's fine
            cliLogger.debug(`No progress file to clear for ${modelName}`);
        }
    }

    /**
     * Get progress summary for display
     */
    static async getProgressSummary(modelName: string): Promise<string | null> {
        const checkpoint = await this.loadProgress(modelName);
        if (!checkpoint) return null;

        const elapsedTime = Date.now() - checkpoint.startTime;
        const progressPercent = (
            (checkpoint.processedRecords / checkpoint.totalRecords) *
            100
        ).toFixed(1);
        const avgTimePerRecord = elapsedTime / checkpoint.processedRecords;
        const remainingRecords =
            checkpoint.totalRecords - checkpoint.processedRecords;
        const estimatedRemainingTime = avgTimePerRecord * remainingRecords;
        const eta = new Date(Date.now() + estimatedRemainingTime);

        return [
            `Migration Progress for ${checkpoint.modelName}:`,
            `  Progress: ${checkpoint.processedRecords.toLocaleString()}/${checkpoint.totalRecords.toLocaleString()} (${progressPercent}%)`,
            `  Skip Position: ${checkpoint.lastSkipValue.toLocaleString()}`,
            `  Batch Size: ${checkpoint.batchSize}`,
            `  Errors: ${checkpoint.errorCount}`,
            `  ETA: ${eta.toLocaleTimeString()}`,
            `  Last Update: ${new Date(
                checkpoint.lastUpdateTime
            ).toLocaleTimeString()}`,
        ].join("\n");
    }

    /**
     * List all active migrations
     */
    static async listActiveMigrations(): Promise<string[]> {
        await this.ensureProgressDir();

        try {
            const files = await fs.readdir(this.PROGRESS_DIR);
            const migrations: string[] = [];

            for (const file of files) {
                if (file.endsWith(".json")) {
                    const modelName = path.basename(file, ".json");
                    const checkpoint = await this.loadProgress(modelName);
                    if (checkpoint && !checkpoint.isComplete) {
                        migrations.push(modelName);
                    }
                }
            }

            return migrations;
        } catch (error) {
            cliLogger.warn(`Failed to list migrations: ${error}`);
            return [];
        }
    }

    /**
     * Check if migration can be resumed
     */
    static async canResume(modelName: string): Promise<boolean> {
        const checkpoint = await this.loadProgress(modelName);
        return checkpoint !== null && !checkpoint.isComplete;
    }

    /**
     * Calculate resume statistics
     */
    static calculateResumeStats(checkpoint: MigrationCheckpoint): {
        timeElapsed: string;
        recordsPerSecond: number;
        progressPercent: number;
        estimatedTimeRemaining: string;
    } {
        const elapsedMs = Date.now() - checkpoint.startTime;
        const elapsedSec = elapsedMs / 1000;
        const recordsPerSecond = checkpoint.processedRecords / elapsedSec;
        const progressPercent =
            (checkpoint.processedRecords / checkpoint.totalRecords) * 100;

        const remainingRecords =
            checkpoint.totalRecords - checkpoint.processedRecords;
        const remainingTimeMs = (remainingRecords / recordsPerSecond) * 1000;

        const formatTime = (ms: number): string => {
            const seconds = Math.floor(ms / 1000);
            const minutes = Math.floor(seconds / 60);
            const hours = Math.floor(minutes / 60);

            if (hours > 0) {
                return `${hours}h ${minutes % 60}m`;
            } else if (minutes > 0) {
                return `${minutes}m ${seconds % 60}s`;
            } else {
                return `${seconds}s`;
            }
        };

        return {
            timeElapsed: formatTime(elapsedMs),
            recordsPerSecond: Math.round(recordsPerSecond),
            progressPercent: Math.round(progressPercent * 100) / 100,
            estimatedTimeRemaining: formatTime(remainingTimeMs),
        };
    }
}
