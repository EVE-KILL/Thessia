import type { IKillmail } from "../../../interfaces/IKillmail";
import { Killmails } from "../../../models/Killmails";

export default defineEventHandler(async (event) => {
  const killmail_id = event.context.params?.id;

  const killmail: IKillmail | null = await Killmails.findOne(
    { killmail_id: killmail_id },
    { _id: 0 },
  );
  const capsuleIds = [670, 33328];

  // If the victim ship_id isn't a capsule, we can't find siblings
  if (!killmail?.victim?.ship_id || !capsuleIds.includes(Number(killmail.victim.ship_id))) {
    throw createError({
      statusCode: 400,
      statusMessage: "Victim ship is not a capsule",
    });
  }

  const victimCharacterId = killmail?.victim?.character_id;
  const systemId = killmail?.system_id;
  const unixTime = Math.floor(Number(killmail?.kill_time));
  const killTimeStart = new Date(unixTime - 3600 * 1000);
  const killTimeEnd = new Date(unixTime + 3600 * 1000);

  const query = {
    "victim.character_id": victimCharacterId,
    "victim.ship_id": { $ne: killmail?.victim?.ship_id },
    system_id: systemId,
    kill_time: { $gte: killTimeStart, $lt: killTimeEnd },
    killmail_id: { $ne: killmail_id },
  };

  const sibling = await Killmails.findOne(
    query,
    { _id: 0, killmail_id: 1 },
    {
      sort: { kill_time: -1 },
    },
  );

  if (!sibling?.killmail_id) {
    throw createError({
      statusCode: 400,
      statusMessage: "No sibling killmail found",
    });
  }

  return [sibling.killmail_id];
});
