import type { Job } from "bullmq";
import { determineRoutingKeys } from "../helpers/DetermineRoutingKeys";
import { createWorker } from "../helpers/Queue";
import { broadcastKillmail } from "../helpers/WSClientManager";
import { processKillmail } from "../queue/Killmail";

export default defineNitroPlugin(() => {
  if (process.env.PROCESS_KILLMAILS !== "true") {
    console.log("✘ Skipping killmail processor");
    return;
  }

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
        broadcastKillmail(killmail, routingKeys);
      }
    },
    {
      concurrency: 5,
    },
  )
    .on("failed", (job: Job | undefined, err: Error) => {
      console.log(
        "Killmail Parser:",
        job?.id,
        "( KillID:",
        job?.data.killmailId,
        `) | ${err.message} | ${process.env.ESI_URL || "https://esi.evetech.net/"}latest/killmails/${job?.data.killmailId}/${job?.data.killmailHash}/`,
      );
    })
    .on("completed", (_job: Job) => {
      //console.log('Killmail Parser:', _job.id, '( KillID:', _job.data.killmailId, ') | Completed');
    });
});
