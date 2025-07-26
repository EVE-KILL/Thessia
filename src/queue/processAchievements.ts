import type { Job } from "bullmq";
import { cliLogger } from "~/server/helpers/Logger";
import { createWorker } from "~/server/helpers/Queue";
import { processAchievement } from "~/server/queue/Achievement";

export default {
    name: "process:achievement",
    description: "Processes achievements",
    run: () => {
        cliLogger.info("✔ Starting achievements processor");

        createWorker(
            "achievement",
            async (job: Job) => {
                const { characterId } = job.data;
                await processAchievement(characterId);
            },
            {
                concurrency: 2,
            }
        )
            .on("failed", (job: Job | undefined, err: Error) => {
                cliLogger.error(
                    `Achievement Processing: ${job?.id} ( CharacterID: ${job?.data.characterId} ) | ${err.message}`
                );
            })
            .on("completed", (job: Job) => {
                cliLogger.info(
                    `Achievement Processing: ${job.id} ( CharacterID: ${job.data.characterId} ) | Completed`
                );
            })
            .on("ready", () => {
                cliLogger.info("Achievement Worker Ready");
            });
    },
};
