import type { Job } from "bullmq";
import { createWorker } from "../server/helpers/Queue";
import { updateWar } from "../server/queue/War";
import { getWarKillmails } from "../server/helpers/ESIData";
import { addKillmail } from "../server/queue/Killmail";
import { cliLogger } from "../server/helpers/Logger";

export default {
  name: "process:wars",
  description: "Process the queued wars",
  run: () => {
    cliLogger.info("✔ Starting war processor");

    createWorker(
      "war",
      async (job: Job) => {
        const warData = await updateWar(job.data.warId);
        if (warData.aggressor.ships_killed > 0 || warData.defender.ships_killed > 0) {
          cliLogger.info(
            `War Update: ${job.id} ( WarID: ${job.data.warId} ) | Processing Killmails`,
          );
          const killmails = await getWarKillmails(job.data.warId);
          for (const killmail of killmails) {
            await addKillmail(killmail.killmail_id, killmail.killmail_hash, job.data.warId, 100);
          }
        }
        const sleepTime = Math.floor(Math.random() * 900) + 100;
        await new Promise((resolve) => setTimeout(resolve, sleepTime));
      },
      {
        concurrency: 1,
      },
    )
      .on("failed", (job: Job | undefined, err: Error) => {
        cliLogger.error(
          `War Update: ${job?.id} ( WarID: ${job?.data.warId} ) | ${err.message} | ${process.env.ESI_URL || "https://esi.evetech.net/"}latest/wars/${job?.data.warId}/`,
        );
      })
      .on("completed", (job: Job) => {
        cliLogger.info(`War Update: ${job.id} ( WarID: ${job.data.warId} ) | Completed`);
      });
  },
};
