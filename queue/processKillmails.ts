import type { Job } from "bullmq";
import { determineRoutingKeys } from "../server/helpers/DetermineRoutingKeys";
import { cliLogger } from "../server/helpers/Logger";
import { createWorker } from "../server/helpers/Queue";
import { broadcastKillmail } from "../server/helpers/Websocket";
import { processKillmail } from "../server/queue/Killmail";

export default {
    name: "process:killmails",
    description: "Processes killmails in the queue",
    run: async () => {
        cliLogger.info("✔ Starting killmail processor");

        createWorker(
            "killmail",
            async (job: Job) => {
                try {
                    const killmail = await processKillmail(
                        job.data.killmailId,
                        job.data.killmailHash,
                        job.data.warId || 0
                    );

                    // Generate routing keys for the killmail
                    const routingKeys = determineRoutingKeys(killmail);

                    // Publish to Redis for WebSocket broadcasting
                    await broadcastKillmail(killmail, routingKeys);
                } catch (error) {
                    cliLogger.error(`ERROR: ${error.message}`);
                    cliLogger.error(
                        `Job ID: ${job.id} | Killmail ID: ${job.data.killmailId}`
                    );
                }
            },
            {
                concurrency: 5,
            }
        )
            .on("failed", (job: Job | undefined, err: Error) => {
                cliLogger.error(
                    `Killmail Parser: ${job?.id} ( KillID: ${
                        job?.data.killmailId
                    } ) | ${err.message} | ${
                        process.env.ESI_URL || "https://esi.evetech.net/"
                    }latest/killmails/${job?.data.killmailId}/${
                        job?.data.killmailHash
                    }/`
                );
            })
            .on("completed", (job: Job) => {
                cliLogger.info(
                    `Killmail Parser: ${job.id} ( KillID: ${job.data.killmailId} ) | Completed`
                );
            });
    },
};
