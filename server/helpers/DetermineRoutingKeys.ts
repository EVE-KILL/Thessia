export function determineRoutingKeys(killmail: any): string[] {
  const routingKeys = new Set(["all"]);
  const totalValue = Number(killmail.total_value) || 0;

  if (totalValue > 1_000_000_000) routingKeys.add("10b");
  if (totalValue > 500_000_000) routingKeys.add("5b");
  const regionId = Number(killmail.region_id);
  if (regionId >= 12_000_000 && regionId <= 13_000_000) routingKeys.add("abyssal");
  if (regionId >= 11_000_001 && regionId <= 11_000_033) routingKeys.add("wspace");
  const systemSecurity = Number(killmail.system_security);
  if (systemSecurity >= 0.45) routingKeys.add("highsec");
  else if (systemSecurity >= 0.0) routingKeys.add("lowsec");
  else routingKeys.add("nullsec");

  const shipGroupId = Number(killmail.victim.ship_group_id);
  if ([547, 485, 513, 902, 941, 30, 659].includes(shipGroupId)) routingKeys.add("big");
  if (killmail.is_solo) routingKeys.add("solo");
  if (killmail.is_npc) routingKeys.add("npc");
  if ([1657, 1406, 1404, 1408, 2017, 2016].includes(shipGroupId)) routingKeys.add("citadel");
  if ([419, 27, 29, 547, 26, 420, 25, 28, 941, 463, 237, 31].includes(shipGroupId))
    routingKeys.add("t1");
  if (
    [324, 898, 906, 540, 830, 893, 543, 541, 833, 358, 894, 831, 902, 832, 900, 834, 380].includes(
      shipGroupId,
    )
  )
    routingKeys.add("t2");
  if ([963, 1305].includes(shipGroupId)) routingKeys.add("t3");
  if ([324, 893, 25, 831, 237].includes(shipGroupId)) routingKeys.add("frigates");
  if ([420, 541].includes(shipGroupId)) routingKeys.add("destroyers");
  if ([906, 26, 833, 358, 894, 832, 963].includes(shipGroupId)) routingKeys.add("cruisers");
  if ([419, 540].includes(shipGroupId)) routingKeys.add("battlecruisers");
  if ([27, 898, 900].includes(shipGroupId)) routingKeys.add("battleships");
  if ([547, 485].includes(shipGroupId)) routingKeys.add("capitals");
  if ([513, 902].includes(shipGroupId)) routingKeys.add("freighters");
  if ([659].includes(shipGroupId)) routingKeys.add("supercarriers");
  if ([30].includes(shipGroupId)) routingKeys.add("titans");

  // Add routing keys for victim (character_id, corporation_id, alliance_id, faction_id), attackers (character_id, corporation_id, alliance_id, faction_id), system_id and region_id
  routingKeys.add(`victim.${killmail.victim.character_id}`);
  routingKeys.add(`victim.${killmail.victim.corporation_id}`);
  if (killmail.victim.alliance_id) routingKeys.add(`victim.${killmail.victim.alliance_id}`);
  if (killmail.victim.faction_id) routingKeys.add(`victim.${killmail.victim.faction_id}`);

  for (const attacker of killmail.attackers) {
    routingKeys.add(`attacker.${attacker.character_id}`);
    routingKeys.add(`attacker.${attacker.corporation_id}`);
    if (attacker.alliance_id) routingKeys.add(`attacker.${attacker.alliance_id}`);
    if (attacker.faction_id) routingKeys.add(`attacker.${attacker.faction_id}`);
  }

  routingKeys.add(`system.${killmail.system_id}`);
  routingKeys.add(`region.${killmail.region_id}`);

  return Array.from(routingKeys);
}
