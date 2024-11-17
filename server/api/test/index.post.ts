import { fetchESIKillmail } from "~/server/helpers/ESIData";
import { parseKillmail } from "~/server/helpers/KillmailParser";
import { ESIKillmail } from "~/types/IESIKillmail";

export default defineEventHandler(async (event) => {
  const query = getQuery(event);
  const killmailId = parseInt(query.killmail_id as number);
  const killmailHash = query.killmail_hash as string;

  let killmail: ESIKillmail = await fetchESIKillmail(killmailId, killmailHash);

  let parsed = await parseKillmail(killmail);

  return parsed;
});
