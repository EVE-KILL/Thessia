import { processKillmail } from "../server/queue/Killmail";
import { createWorker } from "../server/helpers/Queue";
import { determineRoutingKeys } from "../server/helpers/DetermineRoutingKeys";
import { broadcastKillmail } from "../server/helpers/WSClientManager";
import { cliLogger } from "../server/helpers/Logger";
import type { Job } from "bullmq";

export default {
  name: "process:killmails",
  description: "Process Killmails in the queue",
  longRunning: true,
  run: async () => {
    console.log("✔ Starting killmail processor");

    createWorker(
      "killmail",
      async (job: Job) => {
        if (job.data.killmailId && job.data.killmailHash) {
          const killmail = await processKillmail(
            job.data.killmailId,
            job.data.killmailHash,
            job.data.warId || 0,
          );
          const routingKeys = determineRoutingKeys(killmail);

          // This will now publish to Redis instead of directly broadcasting
          await broadcastKillmail(killmail, routingKeys);
        }
      },
      {
        concurrency: 5,
      },
    )
      .on("failed", (job: Job | undefined, err: Error) => {
        cliLogger.error(
          `Killmail Parser: ${job?.id} ( KillID: ${job?.data.killmailId} ) | ${err.message} | ${process.env.ESI_URL || "https://esi.evetech.net/"}latest/killmails/${job?.data.killmailId}/${job?.data.killmailHash}/`,
        );
      })
      .on("completed", (_job: Job) => {
        cliLogger.info(`Killmail Parser: ${_job.id} ( KillID: ${_job.data.killmailId} ) | Completed`);
      });
  },
};
