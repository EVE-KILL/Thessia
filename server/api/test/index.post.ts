import { fetchESIKillmail } from "~/server/helpers/ESIData";
import { parseKillmail } from "~/server/helpers/KillmailParser";
import { processKillmail } from "~/server/queue/Killmail";
import type { IESIKillmail } from "~/server/interfaces/IESIKillmail";

export default defineEventHandler(async (event) => {
  const query = getQuery(event);
  const killmailId = Number(query.killmail_id as number);
  const killmailHash = query.killmail_hash as string;

  const killmail: IESIKillmail = await fetchESIKillmail(killmailId, killmailHash);
  await processKillmail(killmailId, killmailHash);

  const parsed = await parseKillmail(killmail);

  return parsed;
});
