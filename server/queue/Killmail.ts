import { fetchESIKillmail } from "../helpers/ESIData";
import { parseKillmail } from "../helpers/KillmailParser";
import { createQueue } from "../helpers/Queue";
import type { IKillmail } from "../interfaces/IKillmail";
import { Killmails } from "../models/Killmails";
import { KillmailsESI } from "../models/KillmailsESI";

const killmailQueue = createQueue("killmail");

async function addKillmail(killmailId: number, killmailHash: string, warId = 0, priority = 1) {
  await killmailQueue.add(
    "killmail",
    { killmailId: killmailId, killmailHash: killmailHash, warId: warId },
    {
      priority: priority,
      attempts: 10,
      backoff: {
        type: "fixed",
        delay: 5000, // 5 seconds
      },
      removeOnComplete: 1000,
      removeOnFail: 5000,
    },
  );
}

async function processKillmail(
  killmailId: number,
  killmailHash: string,
  warId = 0,
): Promise<Partial<IKillmail>> {
  const killmail = await fetchESIKillmail(killmailId, killmailHash);

  if (killmail.error || !killmail.victim) {
    throw new Error(`Error fetching killmail: ${killmail.error}`);
  }

  const processedKillmail = await parseKillmail(killmail, warId);
  const model = new Killmails(processedKillmail);
  try {
    await model.save();
  } catch (error) {
    await Killmails.updateOne({ killmail_id: killmailId }, processedKillmail);
  } finally {
    await KillmailsESI.updateOne(
      { killmail_id: killmailId },
      { $set: { processed: true } },
      { upsert: true },
    );
  }

  return processedKillmail;
}

export { addKillmail, processKillmail, fetchESIKillmail };
