import { fetchESIKillmail } from "../../helpers/ESIData";
import { parseKillmail } from "../../helpers/KillmailParser";
import type { IESIKillmail } from "../../interfaces/IESIKillmail";
import type { IKillmail } from "../../interfaces/IKillmail";

export default defineEventHandler(async (event) => {
  const body = await readBody(event);

  const { killmail_id, killmail_hash } = body;

  if (typeof killmail_id !== "number") {
    return { error: "killmail_id is missing or not a number" };
  }

  if (typeof killmail_hash !== "string") {
    return { error: "killmail_hash is missing or not a string" };
  }

  // Check if killmail already exists
  const existingKillmail: IESIKillmail | null = await KillmailsESI.findOne({
    killmail_id: killmail_id,
    killmail_hash: killmail_hash,
  });
  if (existingKillmail) {
    return { error: "Killmail already exists" };
  }

  // Fetch killmail from ESI
  const esiKillmail: IESIKillmail | null = await fetchESIKillmail(killmail_id, killmail_hash);
  if (!esiKillmail || esiKillmail.error) {
    return { error: "Error fetching killmail from ESI", esiError: esiKillmail.error || "" };
  }

  // Process killmail and save to database
  const killmail: Partial<IKillmail> = await parseKillmail(esiKillmail);
  if (!killmail) {
    return { error: "Error parsing killmail" };
  }

  // Save killmail to database
  const km = new Killmails(killmail);
  try {
    await km.save();
  } catch (error) {
    Killmails.updateOne({ killmail_id: killmail.killmail_id }, killmail);
  }

  return { success: "Killmail saved", esi: esiKillmail, killmail: killmail };
});
