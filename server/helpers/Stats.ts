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

    const timeFilter = days > 0
        ? { $gte: new Date(Date.now() - days * 24 * 60 * 60 * 1000) }
        : undefined;

    const killFilter = timeFilter
        ? { [`attackers.${type}`]: id, kill_time: timeFilter }
        : { [`attackers.${type}`]: id };

    const lossFilter = timeFilter
        ? { [`victim.${type}`]: id, kill_time: timeFilter }
        : { [`victim.${type}`]: id };

    // Run database queries in parallel
    const [killCount, lossCount, attackerResults, victimResults] = await Promise.all([
        // Get kill count
        Killmails.countDocuments(killFilter),

        // Get loss count
        Killmails.countDocuments(lossFilter),

        // Get kill details
        Killmails.find(
            killFilter,
            { total_value: 1, is_solo: 1, kill_time: 1 }
        ).cursor().toArray(),

        // Get loss details
        Killmails.find(
            lossFilter,
            { total_value: 1, is_npc: 1, is_solo: 1, kill_time: 1 }
        ).cursor().toArray()
    ]);

    stats.kills = killCount;
    stats.losses = lossCount;

    // Process kill data
    for (const killmail of attackerResults) {
        stats.iskKilled += killmail.total_value || 0;
        stats.soloKills += killmail.is_solo ? 1 : 0;

        const killTime = new Date(killmail.kill_time);
        if (!stats.lastActive || killTime > stats.lastActive) {
            stats.lastActive = killTime;
        }
    }

    // Process loss data
    for (const lossmail of victimResults) {
        stats.iskLost += lossmail.total_value || 0;
        stats.npcLosses += lossmail.is_npc ? 1 : 0;
        stats.soloLosses += lossmail.is_solo ? 1 : 0;

        const killTime = new Date(lossmail.kill_time);
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

    // Initialize heat map
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
        heatMap,
        fliesWithCorporations: {},
        fliesWithAlliances: {},
        sameShipAsOtherAttackers: {},
        whoreKills: 0,
        possibleFC: false,
        possibleCynoAlt: false,
    };

    // Create tracking data structures
    const fliesWithCorpKillmails = new Map<number, Set<string>>();
    const fliesWithAlliKillmails = new Map<number, Set<string>>();
    const diesToCorpKillmails = new Map<number, {
        killmailIds: Set<string>,
        finalBlows: number,
        name: string
    }>();
    const diesToAlliKillmails = new Map<number, {
        killmailIds: Set<string>,
        finalBlows: number,
        name: string
    }>();
    let blobKills = 0;

    // Set up time filter
    const timeFilter = days > 0
        ? { $gte: new Date(Date.now() - days * 24 * 60 * 60 * 1000) }
        : undefined;

    const killFilter = timeFilter
        ? { [`attackers.${type}`]: id, kill_time: timeFilter }
        : { [`attackers.${type}`]: id };

    const lossFilter = timeFilter
        ? { [`victim.${type}`]: id, kill_time: timeFilter }
        : { [`victim.${type}`]: id };

    // Run database queries in parallel
    const [killCount, lossCount, attackerKillmails, victimKillmails] = await Promise.all([
        // Get kill count
        Killmails.countDocuments(killFilter),

        // Get loss count
        Killmails.countDocuments(lossFilter),

        // Get kill details - only requesting fields we need
        Killmails.find(
            killFilter,
            {
                killmail_id: 1,
                total_value: 1,
                is_solo: 1,
                kill_time: 1,
                "victim.damage_taken": 1,
                "attackers.ship_id": 1,
                "attackers.ship_name": 1,
                "attackers.corporation_id": 1,
                "attackers.corporation_name": 1,
                "attackers.alliance_id": 1,
                "attackers.alliance_name": 1,
                "attackers.damage_done": 1,
                "attackers.final_blow": 1,
                [`attackers.${type}`]: 1
            }
        ).cursor().toArray(),

        // Get loss details - only requesting fields we need
        Killmails.find(
            lossFilter,
            {
                killmail_id: 1,
                total_value: 1,
                is_npc: 1,
                is_solo: 1,
                kill_time: 1,
                "victim.ship_id": 1,
                "victim.ship_name": 1,
                "attackers.corporation_id": 1,
                "attackers.corporation_name": 1,
                "attackers.alliance_id": 1,
                "attackers.alliance_name": 1,
                "attackers.final_blow": 1,
                ...(type === "character_id" ? { items: 1 } : {})
            }
        ).cursor().toArray()
    ]);

    // Set basic stats
    stats.kills = killCount;
    stats.losses = lossCount;

    // Process killmails
    // We can process both datasets in parallel
    await Promise.all([
        // Process attacker killmails
        (async () => {
            for (const killmail of attackerKillmails) {
                const killTime = new Date(killmail.kill_time);

                stats.iskKilled += killmail.total_value || 0;
                stats.soloKills += killmail.is_solo ? 1 : 0;

                // Update lastActive
                if (!stats.lastActive || killTime > new Date(stats.lastActive)) {
                    stats.lastActive = killTime.toISOString();
                }

                // Update heat map
                const hourKey = `h${killTime.getUTCHours().toString().padStart(2, "0")}`;
                stats.heatMap[hourKey]++;

                if (!Array.isArray(killmail.attackers)) continue;

                // Blob factor calculation
                if (killmail.attackers.length > 10) {
                    blobKills++;
                }

                // Find our entity in attackers list
                const totalDamage = killmail?.victim?.damage_taken || 0;
                let entityAttacker = null;

                for (const attacker of killmail.attackers) {
                    if (attacker[type] === id) {
                        entityAttacker = attacker;

                        // Check for whore kill
                        if (totalDamage > 0 && (attacker.damage_done || 0) < totalDamage * 0.01) {
                            stats.whoreKills++;
                        }
                        break;
                    }
                }

                if (!entityAttacker) continue;

                // Process entity's ship
                const entityShipId = entityAttacker.ship_id || 0;
                if (entityShipId) {
                    const shipName = entityAttacker.ship_name || { en: "" };
                    stats.mostUsedShips[entityShipId] = stats.mostUsedShips[entityShipId] || {
                        count: 0,
                        name: shipName,
                    };
                    stats.mostUsedShips[entityShipId].count++;
                }

                // Process flies with data
                const killmailId = killmail.killmail_id?.toString() || '';
                if (!killmailId) continue;

                // Collect unique corps and alliances for this killmail
                const corpIds = new Set<number>();
                const alliIds = new Set<number>();
                let sameShipCount = 0;

                for (const attacker of killmail.attackers) {
                    if (attacker[type] === id) continue;

                    // Check for same ship usage
                    if (entityShipId && attacker.ship_id === entityShipId) {
                        sameShipCount++;
                    }

                    const corpId = attacker.corporation_id || 0;
                    const alliId = attacker.alliance_id || 0;

                    if (corpId && corpId !== id) corpIds.add(corpId);
                    if (alliId && alliId !== id) alliIds.add(alliId);
                }

                // Record this killmail with each corporation
                for (const corpId of corpIds) {
                    if (!fliesWithCorpKillmails.has(corpId)) {
                        fliesWithCorpKillmails.set(corpId, new Set());
                        stats.fliesWithCorporations[corpId] = {
                            count: 0,
                            name: (killmail.attackers.find(a => a.corporation_id === corpId)?.corporation_name) || "Unknown",
                        };
                    }
                    fliesWithCorpKillmails.get(corpId).add(killmailId);
                }

                // Record this killmail with each alliance
                for (const alliId of alliIds) {
                    if (!fliesWithAlliKillmails.has(alliId)) {
                        fliesWithAlliKillmails.set(alliId, new Set());
                        stats.fliesWithAlliances[alliId] = {
                            count: 0,
                            name: (killmail.attackers.find(a => a.alliance_id === alliId)?.alliance_name) || "Unknown",
                        };
                    }
                    fliesWithAlliKillmails.get(alliId).add(killmailId);
                }

                // Track same ship usage
                if (sameShipCount > 0 && entityShipId) {
                    stats.sameShipAsOtherAttackers[entityShipId] =
                        (stats.sameShipAsOtherAttackers[entityShipId] || 0) + 1;
                }
            }
        })(),

        // Process victim killmails
        (async () => {
            for (const lossmail of victimKillmails) {
                stats.iskLost += lossmail.total_value || 0;
                stats.npcLosses += lossmail.is_npc ? 1 : 0;
                stats.soloLosses += lossmail.is_solo ? 1 : 0;

                const killTime = new Date(lossmail.kill_time);
                if (!stats.lastActive || killTime > new Date(stats.lastActive)) {
                    stats.lastActive = killTime.toISOString();
                }

                // Special character checks
                if (type === "character_id") {
                    const lostShipId = lossmail?.victim?.ship_id || 0;

                    // Check for FC (Monitor)
                    if (lostShipId === 45534) {
                        stats.possibleFC = true;
                    }

                    // Check for cyno alt
                    const killTimeSec = killTime.getTime() / 1000;
                    const cynoCutoff = new Date("2019-09-01T00:00:00Z").getTime() / 1000;

                    if (stats.kills < 25 && killTimeSec > cynoCutoff && Array.isArray(lossmail.items)) {
                        for (const item of lossmail.items) {
                            if ([28646, 21096, 52694].includes(item.type_id)) {
                                stats.possibleCynoAlt = true;
                                break;
                            }
                        }
                    }
                }

                // Track lost ships
                const lostShipId = lossmail?.victim?.ship_id || 0;
                if (lostShipId) {
                    const lostShipName = lossmail?.victim?.ship_name || { en: "" };
                    stats.mostLostShips[lostShipId] = stats.mostLostShips[lostShipId] || {
                        count: 0,
                        name: lostShipName,
                    };
                    stats.mostLostShips[lostShipId].count++;
                }

                // Track who killed us
                const killmailId = lossmail.killmail_id?.toString() || '';
                if (!killmailId || !Array.isArray(lossmail.attackers)) continue;

                // Process each attacker
                for (const attacker of lossmail.attackers) {
                    const corpId = attacker.corporation_id || 0;
                    const corpName = attacker.corporation_name || "Unknown";
                    const alliId = attacker.alliance_id || 0;
                    const alliName = attacker.alliance_name || "Unknown";
                    const isFinalBlow = !!attacker.final_blow;

                    // Process corporation
                    if (corpId) {
                        if (!diesToCorpKillmails.has(corpId)) {
                            diesToCorpKillmails.set(corpId, {
                                killmailIds: new Set(),
                                finalBlows: 0,
                                name: corpName
                            });
                        }

                        const corpData = diesToCorpKillmails.get(corpId);
                        corpData.killmailIds.add(killmailId);

                        if (isFinalBlow) {
                            corpData.finalBlows++;
                        }
                    }

                    // Process alliance
                    if (alliId) {
                        if (!diesToAlliKillmails.has(alliId)) {
                            diesToAlliKillmails.set(alliId, {
                                killmailIds: new Set(),
                                finalBlows: 0,
                                name: alliName
                            });
                        }

                        const alliData = diesToAlliKillmails.get(alliId);
                        alliData.killmailIds.add(killmailId);

                        if (isFinalBlow) {
                            alliData.finalBlows++;
                        }
                    }
                }
            }
        })()
    ]);

    // Remove system ID 0 from mostUsedShips if present
    if (stats.mostUsedShips[0]) delete stats.mostUsedShips[0];

    // Calculate blob factor
    if (stats.kills > 0) {
        stats.blobFactor = (blobKills / stats.kills) * 100;
    }

    // Update all the final counts from our tracking maps

    // Flies With counts
    for (const [corpId, killmailIds] of fliesWithCorpKillmails.entries()) {
        if (stats.fliesWithCorporations[corpId]) {
            stats.fliesWithCorporations[corpId].count = killmailIds.size;
        }
    }

    for (const [alliId, killmailIds] of fliesWithAlliKillmails.entries()) {
        if (stats.fliesWithAlliances[alliId]) {
            stats.fliesWithAlliances[alliId].count = killmailIds.size;
        }
    }

    // Dies To counts
    for (const [corpId, data] of diesToCorpKillmails.entries()) {
        stats.diesToCorporations[corpId] = {
            count: data.killmailIds.size + data.finalBlows,
            name: data.name
        };
    }

    for (const [alliId, data] of diesToAlliKillmails.entries()) {
        stats.diesToAlliances[alliId] = {
            count: data.killmailIds.size + data.finalBlows,
            name: data.name
        };
    }

    // Same ship count
    const sameShipKeys = Object.keys(stats.sameShipAsOtherAttackers);
    stats.sameShipAsOtherAttackers = sameShipKeys.length;

    // Sort function
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

    // Sort all top stats
    stats.mostUsedShips = sortTop10(stats.mostUsedShips);
    stats.mostLostShips = sortTop10(stats.mostLostShips);
    stats.diesToCorporations = sortTop10(stats.diesToCorporations);
    stats.diesToAlliances = sortTop10(stats.diesToAlliances);
    stats.fliesWithCorporations = sortTop10(stats.fliesWithCorporations);
    stats.fliesWithAlliances = sortTop10(stats.fliesWithAlliances);

    return stats;
}

async function getCorporationTopStats(id: number) {
    // 90 days is the default window for top stats
    return calculateFullStats("corporation_id", id, 90);
}

export { calculateFullStats, calculateShortStats, getCorporationTopStats };

