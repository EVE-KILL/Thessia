import { cliLogger } from "~/server/helpers/Logger";
import { Stats } from "~/server/models/Stats";
import { addBulkStatsJobs } from "~/server/queue/Stats";

export default {
    name: "updateStats",
    description: "Finds stats that need to be updated and queues them",
    schedule: "0 * * * *",
    run: async () => {
        return;
        cliLogger.info("Updating stats");

        // Get current date information for frequency checks
        const now = new Date();
        const currentHour = now.getHours();
        const currentDay = now.getDay(); // 0-6, Sunday is 0

        // Track queued jobs and processed documents
        let queuedCount = 0;
        let processedCount = 0;

        // Create cursor for stats that need updating (only days: 0 as trigger)
        const cursor = Stats.find({
            needsUpdate: true,
            days: 0,
        }).cursor();

        // Batch jobs for bulk insertion
        const jobBatch: Array<{
            entityType: any;
            entityId: number;
            days: number;
            priority: number;
        }> = [];
        const BATCH_SIZE = 100;

        // Process documents one by one using cursor
        for (
            let stat = await cursor.next();
            stat != null;
            stat = await cursor.next()
        ) {
            processedCount++;

            // Determine if this stat should be updated based on frequency rules
            let shouldUpdate = false;
            let priority = 5; // Default priority (lower number = higher priority)

            // Characters: update every hour (always)
            if (stat.type === "character_id") {
                shouldUpdate = true;
                priority = 5;
            }
            // Corporations: update once a day (first hour of day)
            else if (stat.type === "corporation_id") {
                // Check if this is a small corporation (less than 50k kills+losses)
                const isSmallCorp = stat.kills + stat.losses < 50000;

                // Update small corps every hour, larger corps only at midnight
                if (isSmallCorp || currentHour === 0) {
                    shouldUpdate = true;
                    priority = isSmallCorp ? 10 : 15;
                }
            }
            // Alliances: update once a week (Sunday at midnight) or if small
            else if (stat.type === "alliance_id") {
                // Check if this is a small alliance (less than 50k kills+losses)
                const isSmallAlliance = stat.kills + stat.losses < 50000;

                // Update small alliances daily (at midnight), larger alliances weekly (Sunday midnight)
                if (isSmallAlliance && currentHour === 0) {
                    shouldUpdate = true;
                    priority = 20;
                } else if (currentDay === 0 && currentHour === 0) {
                    // Sunday at midnight for large alliances
                    shouldUpdate = true;
                    priority = 25;
                }
            }

            if (shouldUpdate) {
                // Queue jobs for all stat periods (0, 14, 30, 90 days)
                const statPeriods = [0, 14, 30, 90];
                for (const days of statPeriods) {
                    jobBatch.push({
                        entityType: stat.type,
                        entityId: stat.id,
                        days,
                        priority,
                    });
                    queuedCount++;
                }

                // Reset the needsUpdate flag for all related stat documents
                await Stats.updateMany(
                    {
                        type: stat.type,
                        id: stat.id,
                    },
                    { $set: { needsUpdate: false } }
                );

                // Process batch if it reaches the batch size
                if (jobBatch.length >= BATCH_SIZE) {
                    await addBulkStatsJobs(jobBatch);
                    jobBatch.length = 0; // Clear the batch
                    cliLogger.info(
                        `Processed batch: ${processedCount} documents processed, ${queuedCount} jobs queued so far`
                    );
                }
            }
        }

        // Process any remaining jobs in the final batch
        if (jobBatch.length > 0) {
            await addBulkStatsJobs(jobBatch);
        }

        if (processedCount === 0) {
            cliLogger.info("No stats need updating");
        } else {
            cliLogger.info(
                `Processed ${processedCount} stats documents, queued ${queuedCount} stats jobs for update`
            );
        }
    },
};
