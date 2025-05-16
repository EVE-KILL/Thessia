import type { Job } from "bullmq";
import { cliLogger } from "~/server/helpers/Logger";
import { createWorker } from "~/server/helpers/Queue";
import { processStats } from "~/server/queue/Stats";

export default {
    name: "process:stats",
    description: "Processes stats jobs in the queue",
    run: async () => {
        cliLogger.info("✔ Starting stats processor");

        createWorker(
            "stats",
            async (job: Job) => {
                await processStats(
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
