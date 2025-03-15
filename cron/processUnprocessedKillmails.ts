import { cliLogger } from "../server/helpers/Logger";
import { createQueue } from "../server/helpers/Queue";
import { KillmailsESI } from "../server/models/KillmailsESI";

export default {
  name: "processUnprocessedKillmails",
  description: "Process unprocessed killmails",
  schedule: "* * * * *",
  run: async () => {
    // Load up the killmail queue
    const killmailQueue = createQueue("killmail");

    // If the queue has unprocessed killmails, don't add more
    const queueCount = await killmailQueue.count();
    if (queueCount > 0) {
      return {
        result: {
          foundKillmailCount: 0,
        },
      };
    }

    // Limit it to 1 million mails at a time
    const limit = 1000000;

    const unprocessedKillmails = await KillmailsESI.find(
      {
        processed: false,
      },
      { killmail_id: 1, killmail_hash: 1 },
      { limit: limit, sort: { killmail_time: -1 }, hint: "killmail_time_-1_processed_1" },
    );

    await killmailQueue.addBulk(
      unprocessedKillmails.map((killmail) => ({
        name: "killmail",
        data: {
          killmailId: killmail.killmail_id,
          killmailHash: killmail.killmail_hash,
        },
        opts: {
          priority: 5,
          attempts: 10,
          backoff: {
            type: "fixed",
            delay: 5000, // 5 seconds
          },
          removeOnComplete: true,
          removeOnFail: true,
        },
      })),
    );

    return cliLogger.info(
      `Added ${unprocessedKillmails.length} unprocessed killmails to the queue`,
    );
  },
};
