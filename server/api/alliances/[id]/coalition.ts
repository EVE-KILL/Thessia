import { defineEventHandler } from "h3";

export default defineEventHandler(async (event) => {
  const allianceId: number | null = event.context.params?.id
    ? Number.parseInt(event.context.params.id)
    : null;
  if (!allianceId) {
    return { error: "Alliance ID not provided" };
  }

  const killmailCount = await Killmails.countDocuments({
    "attackers.alliance_id": allianceId,
    kill_time: { $gt: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) },
  });
  if (!killmailCount) {
    return { error: "Alliance ID not provided or no killmails found" };
  }
  const validVictimsThreshold = killmailCount * 0.05;

  // Find all alliances that are in coalition with this alliance
  const killmails = await Killmails.find(
    {
      "attackers.alliance_id": allianceId,
      kill_time: { $gt: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) },
    },
    {
      _id: 0,
      "attackers.alliance_id": 1,
      "attackers.damage_done": 1,
      "victim.alliance_id": 1,
      "victim.damage_taken": 1,
    },
  );

  const attackerCounter = new Map();
  const victimCounter = new Map();

  // Collect all victim alliance IDs
  for (const killmail of killmails) {
    // Count attackers (exclude the main allianceId)
    const victimDamage = killmail.victim?.damage_taken || 0;
    for (const attacker of killmail.attackers) {
      if (attacker.alliance_id && attacker.alliance_id !== allianceId) {
        const minDamageRequired = victimDamage * 0.05;
        if (attacker.damage_done >= minDamageRequired) {
          const c = attackerCounter.get(attacker.alliance_id) || 0;
          attackerCounter.set(attacker.alliance_id, c + 1);
        }
      }
    }
    // Count victims
    if (killmail.victim?.alliance_id) {
      const c = victimCounter.get(killmail.victim.alliance_id) || 0;
      victimCounter.set(killmail.victim.alliance_id, c + 1);
    }
  }

  // Filter out attackers below threshold
  const validAttackers = new Set([...attackerCounter.entries()].map(([id]) => id));

  // Filter out victims below threshold or not attacked by valid attackers
  const validVictims = new Set(
    [...victimCounter.entries()]
      .filter(([allianceId, count]) => count >= validVictimsThreshold)
      .map(([id]) => id),
  );

  // Remove alliances still on victim list
  const finalAlliances = [...validAttackers].filter((a) => !validVictims.has(a));

  // Fetch alliances in one query
  const allianceInfos = await Alliances.find(
    { alliance_id: { $in: finalAlliances } },
    { _id: 0, alliance_id: 1, name: 1 },
  );
  const allianceInfoMap = new Map(allianceInfos.map((info) => [info.alliance_id, info.name]));

  const result = finalAlliances.map((id) => ({
    alliance_id: id,
    name: allianceInfoMap.get(id) || "Unknown",
    count: attackerCounter.get(id) || 0,
  }));

  result.sort((a, b) => b.count - a.count);
  const topTen = result.slice(0, 10);

  return topTen.map(({ alliance_id, name }) => ({
    alliance_id,
    name: name,
  }));
});
