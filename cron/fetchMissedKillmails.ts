import { cliLogger } from "../server/helpers/Logger";
import { addKillmail } from "../server/queue/Killmail";
import { KillmailsESI } from "../server/models/KillmailsESI";

export default {
  name: "fetchMissedKillmails",
  description: "Updates the affiliations of characters",
  schedule: "0 * * * *",
  run: async () => {
    const zkbHistoryTotals = "https://zkillboard.com/api/history/totals.json";
    const response = await fetch(zkbHistoryTotals);
    const data = await response.json();
    let foundKillmailCount = 0;

    // Get data for the last 7 days (Times in the totals.json is listed as: "YYYYMMDD": count
    // Reverse the array so we get the most recent days first
    const days = Object.entries(data).reverse().slice(0, 7);

    // For each day in the history, get the killmails
    for (const [date] of days) {
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

      // Data is a list of killmails for the day, listed as: { "killmail_id": "killmail_hash", ... }
      for (const [killmail_id, killmail_hash] of missingKillmails) {
        const exists = await KillmailsESI.exists({ killmail_id: killmail_id });
        if (!exists) {
          foundKillmailCount++;
          addKillmail(Number(killmail_id), killmail_hash as string, 0, 4);
        }
      }
    }

    if (process.env.BACKEND_DISCORD_URL !== undefined && foundKillmailCount > 0) {
      await fetch(process.env.BACKEND_DISCORD_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          content: `Found ${foundKillmailCount} missing killmails`,
        }),
      });
    }

    return cliLogger.info(`Found ${foundKillmailCount} missing killmails`);
  },
};
