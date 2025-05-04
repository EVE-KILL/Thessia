import { IKillmail } from "../interfaces/IKillmail";

export async function isKillInBattle(killmail_id: number): Promise<boolean> {
    const killmail: IKillmail | null = await Killmails.findOne({
        killmail_id: killmail_id,
    }, { _id: 0, system_id: 1, kill_time: 1 });

    if (!killmail) {
        throw createError({
            statusCode: 400,
            statusMessage: "Killmail not found",
        });
    }

    const killTime = new Date(killmail.kill_time);
    const systemId = killmail.system_id;

    const startTime = new Date(killTime.getTime() - 3600 * 1000);
    const endTime = new Date(killTime.getTime() + 3600 * 1000);

    const pipeline = [
        {
            '$match': {
                'system_id': systemId,
                'kill_time': { '$gte': startTime, '$lt': endTime },
            }
        },
        {
            '$group': {
                '_id': '$battle_id',
                'count': { '$sum': 1 },
            }
        },
        {
            '$match': {
                'count': {
                    '$gte': 10,
                }
            }
        },
        {
            '$sort': {
                'count': -1,
            }
        },
        {
            '$limit': 1,
        }
    ];

    const result = await Killmails.aggregate(pipeline, { allowDiskUse: true });
    if (result.length === 0) {
        return false;
    }

    return true;
}

export async function getBattleData(killmail_id: number) {
    const killmail: IKillmail | null = await Killmails.findOne({
        killmail_id: killmail_id,
    }, { _id: 0, system_id: 1, kill_time: 1 });

    if (!killmail) {
        return [];
    }

    const killTime = new Date(killmail.kill_time);
    const systemId = killmail.system_id;
    const systemData = await SolarSystems.findOne({ system_id: systemId }, { _id: 0, system_name: 1, region_id: 1, security: 1 });
    const regionData = await Regions.findOne({ region_id: systemData?.region_id }, { _id: 0, name: 1 });
    const startTime = Math.floor(killTime.getTime() / 1000) - 3600;
    let endTime = Math.floor(killTime.getTime() / 1000) + 3600;

    let extensibleToTime = endTime;
    let segmentStart = startTime;
    let segmentEnd = startTime + 300;
    let foundStart = false;
    let foundEnd = false;
    let battleStartTime = 0;
    let battleEndTime = 0;
    let failCounter = 0;
    const killCountToConsiderStart = 5;
    const killCountToConsiderEnd = 15;

    do {
        const killCount = await Killmails.countDocuments({
            kill_time: {
                $gte: new Date(segmentStart * 1000),
                $lte: new Date(segmentEnd * 1000)
            },
            system_id: systemId
        });

        if (killCount >= killCountToConsiderStart) {
            if (!foundStart) {
                foundStart = true;
                battleStartTime = segmentStart;
            }
            failCounter = 0;
        } else {
            if (failCounter >= 3) {
                foundEnd = true;
                battleEndTime = segmentStart;
            }
            failCounter++;
        }

        // Extend the window if high activity at the end
        if (segmentEnd >= extensibleToTime && killCount >= killCountToConsiderEnd) {
            extensibleToTime += 1600;
        }

        segmentStart += 300;
        segmentEnd += 300;
    } while (segmentEnd < extensibleToTime);

    let battleData = [];
    if (foundStart && foundEnd) {
        if (battleEndTime > battleStartTime) {
            // Call processBattle to build the battle data
            battleData = await processBattle(systemId, battleStartTime, battleEndTime, killmail_id);
        }
    }

    return {
        system_name: systemData?.system_name,
        system_security: systemData?.security,
        region_id: systemData?.region_id,
        region_name: regionData?.name,
        ...battleData,
    }
}

async function processBattle(systemId: number, battleStartTime: number, battleEndTime: number, seedKillmailId: number): Promise<any> {
    // Fetch kills in the battle window
    const kills = await Killmails.aggregate([
        {
            $match: {
                kill_time: { $gte: new Date(battleStartTime * 1000), $lte: new Date(battleEndTime * 1000) },
                system_id: systemId
            }
        },
        {
            $project: {
                _id: 0,
                items: 0
            }
        }
    ]);

    // Find the seed killmail
    const seedKillmail = kills.find((k: any) => k.killmail_id === seedKillmailId);
    if (!seedKillmail) {
        // fallback: use first killmail in window
        if (kills.length === 0) return [];
        return findTeamsEDK(kills[0], kills, systemId, battleStartTime, battleEndTime);
    }
    return findTeamsEDK(seedKillmail, kills, systemId, battleStartTime, battleEndTime);
}

/**
 * EDK-style team assignment:
 * - Side A: victim's alliance/corp from seed killmail
 * - Side B: all attackers from seed killmail not in victim's alliance/corp
 * - For all killmails, assign sides based on these lists
 */
function findTeamsEDK(
    seedKillmail: any,
    killmails: any[],
    systemId: number,
    battleStartTime: number,
    battleEndTime: number
): any {
    // Build side A (victim's alliance/corp)
    const sideAAlliances = new Set<number>();
    const sideACorps = new Set<number>();
    if (seedKillmail.victim.alliance_id) sideAAlliances.add(seedKillmail.victim.alliance_id);
    if (seedKillmail.victim.corporation_id) sideACorps.add(seedKillmail.victim.corporation_id);

    // Build side B (attackers not in victim's alliance/corp)
    const sideBAlliances = new Set<number>();
    const sideBCorps = new Set<number>();
    for (const attacker of seedKillmail.attackers) {
        if (
            (attacker.alliance_id && !sideAAlliances.has(attacker.alliance_id)) ||
            (attacker.corporation_id && !sideACorps.has(attacker.corporation_id))
        ) {
            if (attacker.alliance_id && !sideAAlliances.has(attacker.alliance_id)) {
                sideBAlliances.add(attacker.alliance_id);
            }
            if (attacker.corporation_id && !sideACorps.has(attacker.corporation_id)) {
                sideBCorps.add(attacker.corporation_id);
            }
        }
    }

    // If board owner logic is needed, swap sides here (not implemented, as not relevant for API consumers)

    // Collect all alliances/corps for each side (no expansion)
    const blueTeam = {
        alliances: Array.from(sideAAlliances).map(id => ({ id, name: seedKillmail.victim.alliance_name })),
        corporations: Array.from(sideACorps).map(id => ({ id, name: seedKillmail.victim.corporation_name }))
    };
    const redTeam = {
        alliances: Array.from(sideBAlliances).map(id => ({ id, name: null })),
        corporations: Array.from(sideBCorps).map(id => ({ id, name: null }))
    };

    // Fill in names for red team from killmails
    for (const killmail of killmails) {
        for (const attacker of killmail.attackers) {
            if (attacker.alliance_id && sideBAlliances.has(attacker.alliance_id)) {
                const exists = redTeam.alliances.find(a => a.id === attacker.alliance_id);
                if (exists && !exists.name && attacker.alliance_name) exists.name = attacker.alliance_name;
            }
            if (attacker.corporation_id && sideBCorps.has(attacker.corporation_id)) {
                const exists = redTeam.corporations.find(c => c.id === attacker.corporation_id);
                if (exists && !exists.name && attacker.corporation_name) exists.name = attacker.corporation_name;
            }
        }
    }

    // Fetch system info (should be done outside, but for compatibility, return structure)
    return {
        start_time: battleStartTime,
        end_time: battleEndTime,
        system_id: systemId,
        blue_team: blueTeam,
        red_team: redTeam
    };
}
