import type {
  IESIAttacker,
  IESIKillmail,
  IESIVictim,
  IESIVictimItem,
} from "../interfaces/IESIKillmail";
import type { IAttacker, IItem, IKillmail, IVictim } from "../interfaces/IKillmail";
import type { ITranslation } from "../interfaces/ITranslation";
import { Celestials } from "../models/Celestials";
import { Characters } from "../models/Characters";

import {
  cacheHits,
  getCachedAlliance,
  getCachedCharacter,
  getCachedConstellation,
  getCachedCorporation,
  getCachedFaction,
  getCachedInvGroup,
  getCachedItem,
  getCachedPrice,
  getCachedRegion,
  getCachedSolarSystem,
  nearCache,
} from "./RuntimeCache";

async function parseKillmail(killmail: IESIKillmail, warId = 0): Promise<Partial<IKillmail>> {
  // Run independent tasks concurrently.
  const [top, victim, attackers, items] = await Promise.all([
    generateTop(killmail, warId),
    processVictim(killmail.victim),
    processAttackers(killmail.attackers),
    processItems(killmail.victim.items, new Date(killmail.killmail_time)),
    updateLastActive(killmail),
  ]);

  return {
    ...top,
    victim,
    attackers,
    items,
  };
}

async function updateLastActive(killmail: IESIKillmail): Promise<void> {
  const attackerTasks = killmail.attackers
    .filter((attacker) => attacker.character_id)
    .map(async (attacker) => {
      const existing = await Characters.findOne(
        { character_id: attacker.character_id },
        { last_active: 1 },
      );
      if (existing && existing.last_active < new Date(killmail.killmail_time)) {
        return Characters.updateOne(
          { character_id: attacker.character_id },
          { last_active: killmail.killmail_time },
        );
      }
    });
  // Process victim update separately.
  const victimTask = (async () => {
    const existing = await Characters.findOne(
      { character_id: killmail.victim.character_id },
      { last_active: 1 },
    );
    if (existing && existing.last_active < new Date(killmail.killmail_time)) {
      return Characters.updateOne(
        { character_id: killmail.victim.character_id },
        { last_active: killmail.killmail_time },
      );
    }
  })();
  await Promise.all([...attackerTasks, victimTask]);
}

async function calculateKillValue(
  killmail: IESIKillmail,
): Promise<{ item_value: number; ship_value: number; total_value: number }> {
  const shipTypeId = Number(killmail.victim.ship_type_id);
  const shipValue = await getCachedPrice(shipTypeId, new Date(killmail.killmail_time));
  let itemValue = 0;

  for (const item of killmail.victim.items) {
    if (item.items) {
      for (const cargoItem of item.items) {
        itemValue += await getItemValue(cargoItem, new Date(killmail.killmail_time), true);
      }
    }
    itemValue += await getItemValue(item, new Date(killmail.killmail_time));
  }

  return {
    item_value: itemValue,
    ship_value: shipValue,
    total_value: itemValue + shipValue,
  };
}

async function getItemValue(
  item: IESIVictimItem,
  killTime: Date,
  isCargo = false,
): Promise<number> {
  const typeId = Number(item.item_type_id);
  const flag = item.flag;

  const id = await getCachedItem(typeId);
  const itemName: ITranslation = id?.name || { en: `Type ID ${typeId}` };

  let price = 0;

  if (typeId === 33329 && flag === 89) {
    price = 0.01;
  } else {
    price = await getCachedPrice(typeId, killTime);
  }

  if (isCargo && itemName.en.includes("Blueprint")) {
    item.singleton = 2;
  }

  if (item.singleton === 2) {
    price /= 100;
  }

  const dropped = Number(item.quantity_dropped || 0);
  const destroyed = Number(item.quantity_destroyed || 0);

  return price * (dropped + destroyed);
}

async function generateTop(killmail: IESIKillmail, warId = 0): Promise<Partial<IKillmail>> {
  const [solarSystem, killValue] = await Promise.all([
    getCachedSolarSystem(killmail.solar_system_id),
    calculateKillValue(killmail),
  ]);

  let constellation = null;
  let region = null;
  if (solarSystem) {
    [constellation, region] = await Promise.all([
      getCachedConstellation(solarSystem.constellation_id),
      getCachedRegion(solarSystem.region_id),
    ]);
  }
  const x = killmail.victim?.position?.x || 0;
  const y = killmail.victim?.position?.y || 0;
  const z = killmail.victim?.position?.z || 0;
  return {
    killmail_id: killmail.killmail_id,
    killmail_hash: killmail.killmail_hash,
    kill_time: new Date(killmail.killmail_time),
    system_id: killmail.solar_system_id,
    system_name: solarSystem?.system_name || "",
    system_security: solarSystem?.security || 0,
    constellation_id: solarSystem?.constellation_id || 0,
    constellation_name: constellation?.constellation_name || "",
    region_id: solarSystem?.region_id || 0,
    region_name: region?.name || { en: "" },
    near: await getNear(Number(x), Number(y), Number(z), Number(killmail.solar_system_id)),
    x,
    y,
    z,
    ship_value: killValue.ship_value,
    fitting_value: killValue.item_value,
    total_value: killValue.total_value,
    is_npc: await isNPC(killmail),
    is_solo: await isSolo(killmail),
    war_id: warId,
  };
}

async function processVictim(victim: IESIVictim): Promise<IVictim> {
  const ship = (await getCachedItem(Number(victim.ship_type_id))) || null;
  const shipGroup = ship?.group_id ? await getCachedInvGroup(ship.group_id) : null;

  // Use cached character, corporation, alliance and faction lookups
  const character = victim.character_id ? await getCachedCharacter(victim.character_id) : null;
  const corporation = await getCachedCorporation(victim.corporation_id);
  const alliance = victim.alliance_id ? await getCachedAlliance(Number(victim.alliance_id)) : null;
  const faction = victim.faction_id ? await getCachedFaction(Number(victim.faction_id)) : null;

  return {
    ship_id: victim.ship_type_id || 0,
    ship_name: ship?.name || { en: "" },
    ship_group_id: shipGroup?.group_id || 0,
    ship_group_name: shipGroup?.name || { en: "" },
    damage_taken: victim.damage_taken || 0,
    character_id: victim.character_id || 0,
    character_name: character?.name || ship?.name.en || "",
    corporation_id: victim.corporation_id || 0,
    corporation_name: corporation.name || "",
    alliance_id: victim.alliance_id || 0,
    alliance_name: alliance?.name || "",
    faction_id: victim.faction_id || 0,
    faction_name: faction?.name || "",
  };
}

async function getNear(x: number, y: number, z: number, solarSystemId: number): Promise<string> {
  if (x === 0 && y === 0 && z === 0) {
    return "";
  }

  const nearKey = `${solarSystemId}-${x}-${y}-${z}`;
  const cached = nearCache.get(nearKey);
  if (cached) {
    cacheHits.near++;
    return cached;
  }

  // This query remains here due to its complexity
  const distance = 1000 * 3.086e16;

  const celestials = await Celestials.aggregate([
    {
      $match: {
        solar_system_id: solarSystemId,
        x: { $gt: x - distance, $lt: x + distance },
        y: { $gt: y - distance, $lt: y + distance },
        z: { $gt: z - distance, $lt: z + distance },
      },
    },
    {
      $project: {
        item_id: 1,
        item_name: 1,
        distance: {
          $sqrt: {
            $add: [
              { $pow: [{ $subtract: ["$x", x] }, 2] },
              { $pow: [{ $subtract: ["$y", y] }, 2] },
              { $pow: [{ $subtract: ["$z", z] }, 2] },
            ],
          },
        },
      },
    },
    { $sort: { distance: 1 } },
    { $limit: 1 },
  ]);

  const result = celestials?.[0]?.item_name || "";
  nearCache.set(nearKey, result);
  return result;
}

async function isNPC(killmail: IESIKillmail): Promise<boolean> {
  const attackerCount = killmail.attackers.length;

  const npcStatuses = await Promise.all(
    killmail.attackers.map(async (attacker) => {
      if (!attacker.ship_type_id) return false;

      const ship = await getCachedItem(attacker.ship_type_id);
      if (!ship) return false;

      // Use updated helper instead of direct DB call
      const shipGroup = await getCachedInvGroup(ship.group_id);
      return shipGroup?.category_id === 11;
    }),
  );

  // Count NPC attackers based on resolved statuses
  const npcCount = npcStatuses.filter((isNpc) => isNpc).length;
  return attackerCount > 0 && npcCount > 0 && attackerCount === npcCount;
}

async function isSolo(killmail: IESIKillmail): Promise<boolean> {
  const attackerCount = killmail.attackers.length;
  if (attackerCount === 1) return true;
  if (attackerCount > 2) return false;

  const npcCount = killmail.attackers.filter(
    (attacker) =>
      attacker.character_id === 0 &&
      Number(attacker.corporation_id) < 1999999 &&
      attacker.corporation_id !== 1000125,
  ).length;

  return npcCount > 0 && 2 / npcCount === 2;
}

async function processAttackers(attackers: IESIAttacker[]): Promise<IAttacker[]> {
  return await Promise.all(
    attackers.map(async (attacker) => {
      const ship = attacker.ship_type_id
        ? await getCachedItem(attacker.ship_type_id)
        : attacker.weapon_type_id
          ? await getCachedItem(attacker.weapon_type_id)
          : null;
      const weapon = attacker.weapon_type_id
        ? await getCachedItem(attacker.weapon_type_id)
        : await getCachedItem(attacker.ship_type_id);

      const shipGroup = ship?.group_id ? await getCachedInvGroup(ship.group_id) : null;
      const character = attacker.character_id
        ? await getCachedCharacter(attacker.character_id)
        : null;
      const corporation = attacker.corporation_id
        ? await getCachedCorporation(attacker.corporation_id)
        : null;
      const alliance = attacker.alliance_id
        ? await getCachedAlliance(Number(attacker.alliance_id))
        : null;
      const faction = attacker.faction_id
        ? await getCachedFaction(Number(attacker.faction_id))
        : null;
      return {
        ship_id: attacker.ship_type_id || attacker.weapon_type_id || 0,
        ship_name: ship?.name || weapon?.name || { en: "" },
        ship_group_id: shipGroup?.group_id || 0,
        ship_group_name: shipGroup?.name || { en: "" },
        character_id: attacker.character_id || 0,
        character_name: character?.name || ship?.name.en || weapon?.name.en || "",
        corporation_id: attacker.corporation_id || 0,
        corporation_name: corporation?.name || "",
        alliance_id: attacker.alliance_id || 0,
        alliance_name: alliance?.name || "",
        faction_id: attacker.faction_id || 0,
        faction_name: faction?.name || "",
        security_status: attacker.security_status,
        damage_done: attacker.damage_done,
        final_blow: attacker.final_blow,
        weapon_type_id: attacker.weapon_type_id || 0,
        weapon_type_name: weapon?.name || { en: "" },
      };
    }),
  );
}

async function processItems(items: IESIVictimItem[], killmail_date: Date): Promise<IItem[]> {
  return await Promise.all(
    items.map(async (item) => {
      const type = (await getCachedItem(Number(item.item_type_id))) || null;
      const group = type?.group_id ? await getCachedInvGroup(type.group_id) : null;
      const nestedItems = item.items ? await processItems(item.items, killmail_date) : [];
      const value = await getCachedPrice(Number(item.item_type_id), killmail_date);
      return {
        type_id: item.item_type_id || 0,
        name: type?.name || { en: "" },
        group_id: type?.group_id || 0,
        group_name: group?.name || { en: "" },
        category_id: group?.category_id || 0,
        flag: item.flag || 0,
        qty_dropped: Number(item.quantity_dropped || 0),
        qty_destroyed: Number(item.quantity_destroyed || 0),
        singleton: item.singleton || 0,
        value: value || 0,
        ...(nestedItems.length > 0 && { items: nestedItems }),
      };
    }),
  );
}

export { parseKillmail };
