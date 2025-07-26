import type { Job } from "bullmq";
import { cliLogger } from "~/server/helpers/Logger";
import { createWorker } from "~/server/helpers/Queue";
import { processHistoricalStats } from "~/server/queue/HistoricalStats";

export default {
    name: "process:historicalStats",
    description:
        "Processes historical statistics for alliances and corporations",
    run: () => {
        cliLogger.info("✔ Starting historical stats processor");

        createWorker(
            "historicalStats",
            async (job: Job) => {
                const { entityId, entityType, memberCount, currentDate } =
                    job.data;
                await processHistoricalStats(
                    entityId,
                    entityType,
                    memberCount,
                    new Date(currentDate)
                );
            },
            {
                concurrency: 1, // Higher concurrency for stats processing
            }
        )
            .on("failed", (job: Job | undefined, err: Error) => {
                cliLogger.error(
                    `Historical Stats Processing: ${job?.id} ( ${job?.data.entityType}ID: ${job?.data.entityId} ) | ${err.message}`
                );
            })
            .on("completed", (job: Job) => {
                cliLogger.info(
                    `Historical Stats Processing: ${job.id} ( ${job.data.entityType}ID: ${job.data.entityId} ) | Completed`
                );
            })
            .on("ready", () => {
                cliLogger.info("Historical Stats Worker Ready");
            });
    },
};
