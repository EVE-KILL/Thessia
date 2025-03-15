import { KillmailsESI } from "../server/models/KillmailsESI";
import { createQueue } from "../server/helpers/Queue";

export default {
  name: "backfill:killmailsfromzkb",
  description:
    "Use the zKillboard history endpoint to backfill missing killmails in the ESI database",
  longRunning: false,
  run: async () => {
    const zkbHistoryTotals = "https://zkillboard.com/api/history/totals.json";

    const response = await fetch(zkbHistoryTotals);
    const data = await response.json();

    const killmailQueue = createQueue("killmail");

    // For each day in the history, get the killmails
    for (const [date] of Object.entries(data).reverse()) {
      // Skip ahead to 20240411
      //if (date > '20240411') {
      //    continue;
      //}
      console.log(`Getting killmails for ${date}`);
      const zkbHistory = `https://zkillboard.com/api/history/${date}.json`;
      const response = await fetch(zkbHistory);
      const data = await response.json();

      const existingKillmails = await KillmailsESI.find(
        { killmail_id: { $in: Object.keys(data) } },
        { killmail_id: 1 },
      ).lean();
      const existingIds = new Set(existingKillmails.map((k) => k.killmail_id));
      const missingKillmails = Object.entries(data).filter(
        ([killmail_id]) => !existingIds.has(Number(killmail_id)),
      );

      console.log(`Found ${missingKillmails.length} missing killmails for ${date}`);
      killmailQueue.addBulk(
        missingKillmails.map(([killmail_id, killmail_hash]) => ({
          name: "processKillmail",
          data: { killmailId: Number(killmail_id), killmailHash: killmail_hash as string },
          opts: { priority: 100 },
        })),
      );

      console.log(`Queued ${missingKillmails.length} killmails for ${date}`);

      // Sleep to avoid rate limiting
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  },
};
