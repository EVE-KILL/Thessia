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
        await processCampaign(job.data.campaignId);
      },
      {
        concurrency: 2,
      },
    )
      .on("failed", (job: Job | undefined, err: Error) => {
        cliLogger.error(
          `Campaign Processing: ${job?.id} ( CampaignID: ${job?.data.campaignId} ) | ${err.message}`,
        );
      })
      .on("completed", (job: Job) => {
        cliLogger.info(
          `Campaign Processing: ${job.id} ( CampaignID: ${job.data.campaignId} ) | Completed`,
        );
      })
      .on("ready", () => {
        cliLogger.info("Campaign Worker Ready");
      });
  },
};
