import type { Job } from "bullmq";
import { cliLogger } from "~/server/helpers/Logger";
import { createWorker } from "~/server/helpers/Queue";
import { processStats } from "~/server/queue/Stats";

/**
 * Validates that a job has valid entity type and ID parameters
 */
function validateJobData(job: Job): boolean {
    const validTypes = ['character_id', 'corporation_id', 'alliance_id'];
    const { entityType, entityId } = job.data;

    // Check type validity
    if (!entityType || !validTypes.includes(entityType)) {
        cliLogger.warn(`Invalid stats job: Missing or invalid entity type: ${entityType}`);
        return false;
    }

    // Check ID validity
    if (entityId === undefined || entityId === null || isNaN(entityId) || entityId <= 0) {
        cliLogger.warn(`Invalid stats job: Missing or invalid entity ID: ${entityId} for type ${entityType}`);
        return false;
    }

    return true;
}

export default {
    name: "process:stats",
    description: "Processes stats jobs in the queue",
    run: async () => {
        cliLogger.info("✔ Starting stats processor");

        createWorker(
            "stats",
            async (job: Job) => {
                // Validate job data before processing
                if (!validateJobData(job)) {
                    cliLogger.info(`Stats worker: Discarding invalid job #${job.id}`);
                    return null; // Return null to mark job as completed, removing it from queue
                }

                // Process valid job
                return await processStats(
                    job.data.entityType,
                    job.data.entityId,
                    job.data.days
                );
            },
            {
                concurrency: 5,
            },
        )
            .on("failed", (job: Job | undefined, err: Error) => {
                cliLogger.error(`Stats Processor: ${job?.id} ( EntityType: ${job?.data.entityType} | EntityID: ${job?.data.entityId} ) | ${err.message}`);
            })
            .on("completed", (job: Job) => {
                cliLogger.info(`Stats Processor: ${job.id} ( EntityType: ${job.data.entityType} | EntityID: ${job.data.entityId} ) | Completed`);
            });
    },
};
