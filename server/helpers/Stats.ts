async function calculateShortStats(type: string, id: number, days: number) {
  const validTypes = ["character_id", "corporation_id", "alliance_id"];
  if (!validTypes.includes(type)) {
    throw new Error("Invalid stats type");
  }

  if (days < 0) {
    // biome-ignore lint:
    days = 90;
  }

  const stats = {
    kills: 0,
    losses: 0,
    iskKilled: 0,
    iskLost: 0,
    npcLosses: 0,
    soloKills: 0,
    soloLosses: 0,
    lastActive: null,
  };

  // Kill stats
  stats.kills = await Killmails.countDocuments(
    days > 0
      ? {
          [`attackers.${type}`]: id,
          kill_time: {
            $gte: new Date(Date.now() - days * 24 * 60 * 60 * 1000),
          },
        }
      : { [`attackers.${type}`]: id },
  );

  // Loss stats
  stats.losses = await Killmails.countDocuments(
    days > 0
      ? {
          [`victim.${type}`]: id,
          kill_time: {
            $gte: new Date(Date.now() - days * 24 * 60 * 60 * 1000),
          },
        }
      : { [`victim.${type}`]: id },
  );

  // Kills
  const attackerKillmails = Killmails.find(
    days > 0
      ? {
          [`attackers.${type}`]: id,
          kill_time: {
            $gte: new Date(Date.now() - days * 24 * 60 * 60 * 1000),
          },
        }
      : { [`attackers.${type}`]: id },
    { total_value: 1, is_solo: 1, kill_time: 1, [`attackers.${type}`]: 1 },
  ).cursor();

  for await (const killmail of attackerKillmails) {
    stats.iskKilled += killmail.total_value;
    stats.soloKills += killmail.is_solo ? 1 : 0;

    // Get the latest active time
    const killTime = new Date(killmail.kill_time);
    if (!stats.lastActive || killTime > stats.lastActive) {
      stats.lastActive = killTime;
    }
  }

  // Losses
  const victimKillmails = Killmails.find(
    days > 0
      ? {
          [`victim.${type}`]: id,
          kill_time: {
            $gte: new Date(Date.now() - days * 24 * 60 * 60 * 1000),
          },
        }
      : { [`victim.${type}`]: id },
    { total_value: 1, is_npc: 1, is_solo: 1, kill_time: 1 },
  ).cursor();

  for await (const killmail of victimKillmails) {
    stats.iskLost += killmail.total_value;
    stats.npcLosses += killmail.is_npc ? 1 : 0;
    stats.soloLosses += killmail.is_solo ? 1 : 0;

    // Get the latest active time
    const killTime = new Date(killmail.kill_time);
    if (!stats.lastActive || killTime > stats.lastActive) {
      stats.lastActive = killTime;
    }
  }

  return stats;
}

async function calculateFullStats(type: string, id: number, days: number): Promise<IFullStats> {
  const validTypes = ["character_id", "corporation_id", "alliance_id"];
  if (!validTypes.includes(type)) {
    throw new Error("Invalid stats type");
  }

  if (days < 0) {
    // biome-ignore lint:
    days = 90;
  }

  const heatMap = {};
  for (let i = 0; i < 24; i++) {
    const hourString = `h${i.toString().padStart(2, "0")}`;
    heatMap[hourString] = 0;
  }

  const stats = {
    kills: 0,
    losses: 0,
    iskKilled: 0,
    iskLost: 0,
    npcLosses: 0,
    soloKills: 0,
    soloLosses: 0,
    lastActive: null,
    mostUsedShips: {},
    mostLostShips: {},
    diesToCorporations: {},
    diesToAlliances: {},
    blobFactor: 0,
    heatMap: heatMap, // Use the pre-initialized heatmap with string keys
    fliesWithCorporations: {},
    fliesWithAlliances: {},
    sameShipAsOtherAttackers: {},
    whoreKills: 0, // Kills where entity did less than 1% of total damage
    possibleFC: false,
    possibleCynoAlt: false,
  };

  let blobKills = 0;

  // Kill stats
  stats.kills = await Killmails.countDocuments(
    days > 0
      ? {
          [`attackers.${type}`]: id,
          kill_time: {
            $gte: new Date(Date.now() - days * 24 * 60 * 60 * 1000),
          },
        }
      : { [`attackers.${type}`]: id },
  );

  // Loss stats
  stats.losses = await Killmails.countDocuments(
    days > 0
      ? {
          [`victim.${type}`]: id,
          kill_time: {
            $gte: new Date(Date.now() - days * 24 * 60 * 60 * 1000),
          },
        }
      : { [`victim.${type}`]: id },
  );

  // Kills
  const attackerKillmails = Killmails.find(
    days > 0
      ? {
          [`attackers.${type}`]: id,
          kill_time: {
            $gte: new Date(Date.now() - days * 24 * 60 * 60 * 1000),
          },
        }
      : { [`attackers.${type}`]: id },
    {
      total_value: 1,
      is_solo: 1,
      kill_time: 1,
      "victim.damage_taken": 1,
      attackers: 1,
    },
  ).cursor();

  for await (const killmail of attackerKillmails) {
    const killTime = new Date(killmail.kill_time);

    stats.iskKilled += killmail.total_value || 0;
    stats.soloKills += killmail.is_solo ? 1 : 0;

    // Update lastActive
    if (!stats.lastActive || killTime > new Date(stats.lastActive)) {
      stats.lastActive = killTime.toISOString();
    }

    // Heat map (UTC hour)
    const hourKey = `h${killTime.getUTCHours().toString().padStart(2, "0")}`;
    stats.heatMap[hourKey]++;

    // Blob factor
    if (Array.isArray(killmail.attackers) && killmail.attackers.length > 10) {
      blobKills++;
    }

    // Whore kill => <1% of total damage
    const totalDamage = killmail?.victim?.damage_taken || 0;
    if (Array.isArray(killmail.attackers) && totalDamage > 0) {
      for (const attacker of killmail.attackers) {
        if (attacker[type] === id) {
          if ((attacker.damage_done || 0) < totalDamage * 0.01) {
            stats.whoreKills++;
          }
        }
      }
    }

    // Track ships, who we fly with, etc.
    let entityShipId: number | null = null;
    if (Array.isArray(killmail.attackers)) {
      for (const attacker of killmail.attackers) {
        if (attacker[type] === id) {
          entityShipId = attacker.ship_id || 0;
          const shipName = attacker.ship_name || { en: "" };
          stats.mostUsedShips[entityShipId] = stats.mostUsedShips[entityShipId] || {
            count: 0,
            name: shipName,
          };
          stats.mostUsedShips[entityShipId].count++;
        } else if (entityShipId && attacker.ship_id === entityShipId) {
          // Same ship as the entity
          stats.sameShipAsOtherAttackers[entityShipId] =
            (stats.sameShipAsOtherAttackers[entityShipId] || 0) + 1;
        }

        // Track who we fly with (corporations/alliances)
        const corpId = attacker.corporation_id || 0;
        const corpName = attacker.corporation_name || "Unknown";
        const alliId = attacker.alliance_id || 0;
        const alliName = attacker.alliance_name || "Unknown";

        // Only if not our entity's corp/alliance
        if (corpId && corpId !== id) {
          stats.fliesWithCorporations[corpId] = stats.fliesWithCorporations[corpId] || {
            count: 0,
            name: corpName,
          };
          stats.fliesWithCorporations[corpId].count++;
        }
        if (alliId && alliId !== id) {
          stats.fliesWithAlliances[alliId] = stats.fliesWithAlliances[alliId] || {
            count: 0,
            name: alliName,
          };
          stats.fliesWithAlliances[alliId].count++;
        }
      }
    }
  }
  // Remove #system (ID 0) if present
  if (stats.mostUsedShips[0]) delete stats.mostUsedShips[0];

  // Calculate blob factor
  if (stats.kills > 0) {
    stats.blobFactor = (blobKills / stats.kills) * 100;
  }

  // 6) Process all killmails where this entity was a victim
  const victimKillmails = Killmails.find(
    days > 0
      ? {
          [`victim.${type}`]: id,
          kill_time: {
            $gte: new Date(Date.now() - days * 24 * 60 * 60 * 1000),
          },
        }
      : { [`victim.${type}`]: id },
    {
      killmail_id: 1,
      total_value: 1,
      is_npc: 1,
      is_solo: 1,
      kill_time: 1,
      items: 1,
      victim: 1,
      attackers: 1,
    },
  ).cursor();

  for await (const lossmail of victimKillmails) {
    stats.iskLost += lossmail.total_value || 0;
    stats.npcLosses += lossmail.is_npc ? 1 : 0;
    stats.soloLosses += lossmail.is_solo ? 1 : 0;

    const killTime = new Date(lossmail.kill_time);
    if (!stats.lastActive || killTime > new Date(stats.lastActive)) {
      stats.lastActive = killTime.toISOString();
    }

    // If it's a character, check possible FC or cyno alt
    if (type === "character_id") {
      const lostShipId = lossmail?.victim?.ship_id || 0;

      // Possible FC if lost a Monitor (ship_id = 45534)
      if (lostShipId === 45534) {
        stats.possibleFC = true;
      }

      // If less than 25 kills & killTime after 2019-09-01, check for cyno items
      const killTimeSec = killTime.getTime() / 1000;
      const cynoCutoff = new Date("2019-09-01T00:00:00Z").getTime() / 1000;
      if (stats.kills < 25 && killTimeSec > cynoCutoff) {
        if (Array.isArray(lossmail.items)) {
          for (const item of lossmail.items) {
            if ([28646, 21096, 52694].includes(item.type_id)) {
              stats.possibleCynoAlt = true;
              break;
            }
          }
        }
      }
    }

    // Track mostLostShips
    const lostShipId = lossmail?.victim?.ship_id || 0;
    const lostShipName = lossmail?.victim?.ship_name || { en: "" };
    stats.mostLostShips[lostShipId] = stats.mostLostShips[lostShipId] || {
      count: 0,
      name: lostShipName,
    };
    stats.mostLostShips[lostShipId].count++;

    // Who did we die to (corporations, alliances)?
    if (Array.isArray(lossmail.attackers)) {
      for (const attacker of lossmail.attackers) {
        const corpId = attacker.corporation_id || 0;
        const corpName = attacker.corporation_name || "Unknown";
        const alliId = attacker.alliance_id || 0;
        const alliName = attacker.alliance_name || "Unknown";

        if (corpId) {
          stats.diesToCorporations[corpId] = stats.diesToCorporations[corpId] || {
            count: 0,
            name: corpName,
          };
          stats.diesToCorporations[corpId].count++;
        }
        if (alliId) {
          stats.diesToAlliances[alliId] = stats.diesToAlliances[alliId] || {
            count: 0,
            name: alliName,
          };
          stats.diesToAlliances[alliId].count++;
        }
      }
    }
  }

  // Simple inline function to sort by .count desc
  const sortTop10 = <T extends { count: number }>(obj: Record<number, T>) => {
    const entries = Object.entries(obj).sort((a, b) => b[1].count - a[1].count);
    return entries.slice(0, 10).reduce(
      (acc, [key, val]) => {
        acc[Number.parseInt(key)] = val;
        return acc;
      },
      {} as Record<number, T>,
    );
  };

  stats.mostUsedShips = sortTop10(stats.mostUsedShips);
  stats.mostLostShips = sortTop10(stats.mostLostShips);
  stats.diesToCorporations = sortTop10(stats.diesToCorporations);
  stats.diesToAlliances = sortTop10(stats.diesToAlliances);

  // For fliesWithCorporations/Alliances, we keep killmails but
  // also slice the list. We can do it similarly, but let's keep it simple:
  const sortTop10withKillmails = (
    obj: Record<number, { count: number; name: string; killmails: number[] }>,
  ) => {
    const entries = Object.entries(obj).sort((a, b) => b[1].count - a[1].count);
    const top10 = entries.slice(0, 10);
    const out: typeof obj = {};
    for (const [key, val] of top10) {
      // Also limit the killmails array if you want (e.g. to top 50).
      // For simplicity, we’ll keep them all.
      out[Number.parseInt(key)] = val;
      // Remove killmails if you don’t want them
      // delete out[parseInt(key)].killmails;
    }
    return out;
  };

  stats.fliesWithCorporations = sortTop10withKillmails(stats.fliesWithCorporations);
  stats.fliesWithAlliances = sortTop10withKillmails(stats.fliesWithAlliances);

  // sameShipAsOtherAttackers is how many unique killmails had the same ship usage
  const sameShipKeys = Object.keys(stats.sameShipAsOtherAttackers);
  stats.sameShipAsOtherAttackers = sameShipKeys.length;

  return stats;
}

export { calculateShortStats, calculateFullStats };
