import { createQueue } from "../server/helpers/Queue";
import { KillmailsESI } from "../server/models/KillmailsESI";

export default {
  name: "queueUnprocessedKillmails",
  description: "Find all killmails that are in killmailsESI but arent in killmails",
  longRunning: false,
  run: async () => {
    // Create a cursor with batchSize of 50k
    const cursor = KillmailsESI.aggregate([
      {
        $lookup: {
          from: "killmails",
          localField: "killmail_id",
          foreignField: "killmail_id",
          as: "matchedKillmail",
        },
      },
      { $match: { matchedKillmail: { $eq: [] } } },
      { $project: { killmail_id: 1, killmail_hash: 1 } },
    ]).cursor({ batchSize: 50000 });

    const killmailQueue = createQueue("killmail");
    let count = 0;
    let chunk: any[] = [];
    for await (const doc of cursor) {
      chunk.push(doc);
      if (chunk.length >= 50000) {
        count += chunk.length;
        console.log(`Queued ${count} killmails so far...`);
        killmailQueue.addBulk(
          chunk.map((k) => ({
            name: "killmail",
            data: { killmailId: k.killmail_id, killmailHash: k.killmail_hash as string },
            opts: { priority: 100 },
          })),
        );
        chunk = [];
      }
    }
    if (chunk.length) {
      count += chunk.length;
      console.log(`Queued ${count} killmails total.`);
      killmailQueue.addBulk(
        chunk.map((k) => ({
          name: "killmail",
          data: { killmailId: k.killmail_id, killmailHash: k.killmail_hash as string },
          opts: { priority: 100 },
        })),
      );
    }
  },
};
