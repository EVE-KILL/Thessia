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

    if (foundStart && foundEnd) {
        if (battleEndTime < battleStartTime) {
            return [];
        }
        // Call processBattle to build the battle data
        return await processBattle(systemId, battleStartTime, battleEndTime);
    }
    return [];
}

async function processBattle(systemId: number, battleStartTime: number, battleEndTime: number): Promise<any> {
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

    // Find the teams
    const teams = findTeams(kills);
    const redTeam = teams.a;
    const blueTeam = teams.b;

    // Fetch system info
    const systemInfo = await SolarSystems.findOne(
        { system_id: systemId },
        { _id: 0, planets: 0, position: 0, stargates: 0, stations: 0, last_modified: 0 }
    );

    // Build battle object
    const battle: any = {
        start_time: battleStartTime,
        end_time: battleEndTime,
        system_id: systemId,
        systemInfo,
        red_team: redTeam,
        blue_team: blueTeam
    };

    // Sort keys, keeping red_team and blue_team at the end
    const ordered: any = {};
    Object.keys(battle)
        .filter(k => k !== 'red_team' && k !== 'blue_team')
        .sort()
        .forEach(k => { ordered[k] = battle[k]; });
    ordered.red_team = battle.red_team;
    ordered.blue_team = battle.blue_team;

    return ordered;
}

function findTeams(killmails: any[]): any {
    const attackMatrix: Record<number, Record<number, number>> = {};
    const corporationNames: Record<number, string> = {};
    const allianceNames: Record<number, string> = {};
    const corporationAlliances: Record<number, number> = {};

    for (const killmail of killmails) {
        const victim = killmail.victim;
        const attackers = killmail.attackers;
        const totalDamage = victim.damage_taken;

        for (const attacker of attackers) {
            // Only consider attackers who did at least 5% of the total damage
            if (attacker.damage_done < 0.05 * totalDamage) continue;

            // Initialize matrix
            if (!attackMatrix[victim.corporation_id]) attackMatrix[victim.corporation_id] = {};
            if (!attackMatrix[victim.corporation_id][attacker.corporation_id]) attackMatrix[victim.corporation_id][attacker.corporation_id] = 0;
            attackMatrix[victim.corporation_id][attacker.corporation_id]++;

            // Store corporation and alliance names
            if (!corporationNames[victim.corporation_id]) corporationNames[victim.corporation_id] = victim.corporation_name;
            if (victim.alliance_id && !allianceNames[victim.alliance_id]) {
                allianceNames[victim.alliance_id] = victim.alliance_name;
                corporationAlliances[victim.corporation_id] = victim.alliance_id;
            }
            if (!corporationNames[attacker.corporation_id]) corporationNames[attacker.corporation_id] = attacker.corporation_name;
            if (attacker.alliance_id && !allianceNames[attacker.alliance_id]) {
                allianceNames[attacker.alliance_id] = attacker.alliance_name;
                corporationAlliances[attacker.corporation_id] = attacker.alliance_id;
            }
        }
    }

    // Determine the teams
    const teams = determineTeams(attackMatrix, corporationAlliances, corporationNames, allianceNames);

    // Add names to corporations and alliances
    for (const key of Object.keys(teams)) {
        const team = teams[key];
        team.corporations = team.corporations.map((corpId: number) => ({
            id: corpId,
            name: corporationNames[corpId]
        }));
        team.alliances = team.alliances.map((allianceId: number) => ({
            id: allianceId,
            name: allianceNames[allianceId]
        }));
    }

    return teams;
}

function determineTeams(
    attackMatrix: Record<number, Record<number, number>>,
    corporationAlliances: Record<number, number>,
    corporationNames: Record<number, string>,
    allianceNames: Record<number, string>
): any {
    const teams: any = {
        a: { corporations: [], alliances: [] },
        b: { corporations: [], alliances: [] }
    };
    const assignedCorporations: Record<number, string> = {};
    const assignedAlliances: Record<number, string> = {};

    for (const victimCorp in attackMatrix) {
        for (const attackerCorp in attackMatrix[victimCorp]) {
            const victimCorpNum = Number(victimCorp);
            const attackerCorpNum = Number(attackerCorp);

            const victimAlliance = corporationAlliances[victimCorpNum] ?? null;
            const attackerAlliance = corporationAlliances[attackerCorpNum] ?? null;

            if (!assignedCorporations[victimCorpNum] && !assignedCorporations[attackerCorpNum]) {
                teams.a.corporations.push(victimCorpNum);
                teams.b.corporations.push(attackerCorpNum);
                assignedCorporations[victimCorpNum] = 'a';
                assignedCorporations[attackerCorpNum] = 'b';

                if (victimAlliance && !teams.a.alliances.includes(victimAlliance)) {
                    teams.a.alliances.push(victimAlliance);
                    assignedAlliances[victimAlliance] = 'a';
                }
                if (attackerAlliance && !teams.b.alliances.includes(attackerAlliance)) {
                    teams.b.alliances.push(attackerAlliance);
                    assignedAlliances[attackerAlliance] = 'b';
                }
            } else if (assignedCorporations[victimCorpNum] && !assignedCorporations[attackerCorpNum]) {
                const oppositeTeam = assignedCorporations[victimCorpNum] === 'a' ? 'b' : 'a';
                teams[oppositeTeam].corporations.push(attackerCorpNum);
                assignedCorporations[attackerCorpNum] = oppositeTeam;

                if (attackerAlliance && !assignedAlliances[attackerAlliance]) {
                    teams[oppositeTeam].alliances.push(attackerAlliance);
                    assignedAlliances[attackerAlliance] = oppositeTeam;
                }
            } else if (!assignedCorporations[victimCorpNum] && assignedCorporations[attackerCorpNum]) {
                const oppositeTeam = assignedCorporations[attackerCorpNum] === 'a' ? 'b' : 'a';
                teams[oppositeTeam].corporations.push(victimCorpNum);
                assignedCorporations[victimCorpNum] = oppositeTeam;

                if (victimAlliance && !assignedAlliances[victimAlliance]) {
                    teams[oppositeTeam].alliances.push(victimAlliance);
                    assignedAlliances[victimAlliance] = oppositeTeam;
                }
            }
        }
    }

    return teams;
}
