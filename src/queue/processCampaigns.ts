import type { Job } from "bullmq";
import { cliLogger } from "~/server/helpers/Logger";
import { createWorker } from "~/server/helpers/Queue";
import { processCampaign } from "~/server/queue/Campaign";

export default {
    name: "process:campaigns",
    description: "Processes campaign stats generation jobs in the queue",
    run: () => {
        cliLogger.info("✔ Starting campaign processor");

        createWorker(
            "campaign",
            async (job: Job) => {
                cliLogger.info(
                    `Campaign Processing: ${job?.id} ( CampaignID: ${job?.data.campaignId} ) | Starting`
                );
                await processCampaign(job.data.campaignId);

                // Force garbage collection after each job to reclaim memory
                if (global.gc) {
                    global.gc();
                }
            },
            {
                concurrency: 2,
            }
        )
            .on("failed", (job: Job | undefined, err: Error) => {
                cliLogger.error(
                    `Campaign Processing: ${job?.id} ( CampaignID: ${job?.data.campaignId} ) | ${err.message}`
                );
            })
            .on("completed", (job: Job) => {
                cliLogger.info(
                    `Campaign Processing: ${job.id} ( CampaignID: ${job.data.campaignId} ) | Completed`
                );
            })
            .on("ready", () => {
                cliLogger.info("Campaign Worker Ready");
            });
    },
};
