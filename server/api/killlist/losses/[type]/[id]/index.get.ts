import { Killmails } from "../../../../../models/Killmails";
import type { IKillmail } from "../../../../../interfaces/IKillmail";

export default defineEventHandler(async (event) => {
  const query = getQuery(event);
  const type = event.context.params?.type;
  const id = event.context.params?.id;
  let page: number = Number(query.page) || 1;
  let limit: number = Number(query.limit) || 100;
  if (page < 1) page = 1;
  if (limit < 1) limit = 1;
  if (limit > 1000) limit = 1000;

  const mongoQuery = {
    [`victim.${type}_id`]: id,
  };
  const mongoOptions = {
    sort: { kill_time: -1 },
    skip: (page - 1) * limit,
    limit: limit,
  };

  const killmails: IKillmail[] = await Killmails.find(
    mongoQuery,
    { _id: 0, items: 0 },
    mongoOptions,
  );

  const result = killmails.map((killmail) => {
    const finalBlowAttacker = killmail.attackers.find((a) => a.final_blow);

    return {
      killmail_id: killmail.killmail_id,
      total_value: killmail.total_value,
      system_id: killmail.system_id,
      system_name: killmail.system_name,
      system_security: killmail.system_security,
      region_id: killmail.region_id,
      region_name: killmail.region_name,
      kill_time: killmail.kill_time,
      attackerCount: killmail.attackers.length,
      commentCount: 0,
      is_npc: killmail.is_npc,
      is_solo: killmail.is_solo,
      victim: {
        ship_id: killmail.victim.ship_id,
        ship_name: killmail.victim.ship_name,
        character_id: killmail.victim.character_id,
        character_name: killmail.victim.character_name,
        corporation_id: killmail.victim.corporation_id,
        corporation_name: killmail.victim.corporation_name,
        alliance_id: killmail.victim.alliance_id,
        alliance_name: killmail.victim.alliance_name,
        faction_id: killmail.victim.faction_id,
        faction_name: killmail.victim.faction_name,
      },
      finalblow: {
        character_id: finalBlowAttacker.character_id,
        character_name: finalBlowAttacker.character_name,
        corporation_id: finalBlowAttacker.corporation_id,
        corporation_name: finalBlowAttacker.corporation_name,
        alliance_id: finalBlowAttacker.alliance_id,
        alliance_name: finalBlowAttacker.alliance_name,
        faction_id: finalBlowAttacker.faction_id,
        faction_name: finalBlowAttacker.faction_name,
        ship_group_name: finalBlowAttacker.ship_group_name,
      },
    };
  });

  return result;
});
