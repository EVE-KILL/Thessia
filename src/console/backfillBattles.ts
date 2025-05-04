import crypto from "crypto";
import { processBattle } from "~/server/helpers/Battles";
import { cliLogger } from "~/server/helpers/Logger";
import { Battles } from "~/server/models/Battles";
import { Killmails } from "~/server/models/Killmails";

export default {
    name: "backfillBattles",
    description: "Find battles and backfill them in the database",
    longRunning: false,
    run: async () => {
        const firstKillmail = await Killmails.findOne({}, { kill_time: 1 }, { sort: { killmail_id: 1 } });
        const lastKillmail = await Killmails.findOne({}, { kill_time: 1 }, { sort: { killmail_id: -1 } });

        const startTime = new Date(firstKillmail?.kill_time || 0);
        const endTime = new Date(lastKillmail?.kill_time || 0);

        cliLogger.info(`ℹ️  Backfilling battles from ${startTime.toISOString()} to ${endTime.toISOString()}`);

        let fromTime = new Date(startTime.getTime() - 3600 * 1000);
        let toTime = new Date(startTime.getTime() + 3600 * 1000);

        do {
            const pipeline = [
                {
                    '$match': {
                        'kill_time': { '$gte': fromTime, '$lt': toTime },
                    }
                },
                {
                    '$group': {
                        '_id': '$system_id',
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
            ];

            const potentialBattles = await Killmails.aggregate(pipeline, { allowDiskUse: true, hint: 'kill_time_-1' });
            if (potentialBattles.length > 0) {
                for (const battle of potentialBattles) {
                    await processPotentialBattle(battle._id, fromTime, toTime);
                }
            }


            //cliLogger.info(`ℹ️  No battles found between ${fromTime.toISOString()} and ${toTime.toISOString()}`);
            fromTime = toTime;
            toTime = new Date(toTime.getTime() + 3600 * 1000);
        } while (fromTime < endTime);

    },
};

async function processPotentialBattle(systemId: number, fromTime: Date, toTime: Date) {
    let extensibleToTime = new Date(toTime.getTime());
    let segmentStart = new Date(fromTime.getTime());
    let segmentEnd = new Date(fromTime.getTime() + (5 * 60 * 1000));
    let foundStart = false;
    let foundEnd = false;
    let battleStartTime: Date = new Date(0);
    let battleEndTime: Date = new Date(0);
    let failCounter = 0;
    let killCountToConsider = 10;

    do {
        const killCount = await Killmails.countDocuments({
            kill_time: { $gte: segmentStart, $lt: segmentEnd },
            system_id: systemId,
        }, { allowDiskUse: true, hint: 'system_id_-1_kill_time_-1' });

        if (killCount >= killCountToConsider) {
            if (!foundStart) {
                foundStart = true;
                battleStartTime = new Date(segmentStart.getTime());
            }
        } else {
            failCounter++;
        }

        if (segmentEnd >= extensibleToTime && killCount >= killCountToConsider) {
            cliLogger.info(`ℹ️  Extending toTime by 30m because we hit >5 kills in the last 5 minute segment`);
            extensibleToTime = new Date(segmentEnd.getTime() + 30 * 60 * 1000);
        }

        // Add 5 minutes to each
        segmentStart = new Date(segmentStart.getTime() + (5 * 60 * 1000));
        segmentEnd = new Date(segmentEnd.getTime() + (5 * 60 * 1000));

        if (failCounter === 5) {
            foundEnd = true;
            battleEndTime = new Date(segmentStart.getTime());
            break;
        }
    } while (segmentEnd < extensibleToTime);

    if (foundStart && foundEnd) {
        if (battleEndTime < battleStartTime) {
            cliLogger.info(`ℹ️  Battle end time is before start time, skipping`);
            return;
        }

        const battlePipeline = [
            {
                '$match': {
                    'kill_time': { '$gte': battleStartTime, '$lt': battleEndTime },
                    'system_id': systemId,
                }
            },
            {
                '$project': {
                    '_id': 0,
                    'items': 0,
                }
            }
        ];
        const battleData = await Killmails.aggregate(battlePipeline, { allowDiskUse: true, hint: 'system_id_-1_kill_time_-1' });
        const seedKillmail = battleData[0];
        const teams = processBattle(seedKillmail, battleData, systemId, battleStartTime, battleEndTime);

        // Generate a hash from the teams and system ID to create a unique battle ID
        const dataToHash = {
            systemId,
            startTime: battleStartTime.toISOString(),
            endTime: battleEndTime.toISOString(),
            blueTeam: teams.blue_team,
            redTeam: teams.red_team,
        };

        const hash = crypto.createHash('sha256')
            .update(JSON.stringify(dataToHash))
            .digest('hex');

        // Convert hash to a numeric ID by taking first 10 characters and parsing as hex
        const battleId = parseInt(hash.substring(0, 10), 16);

        const battle = {
            'battle_id': battleId,
            'killmailsCount': battleData.length,
            'iskDestroyed': battleData.reduce((acc, killmail) => acc + (killmail.total_value || 0), 0),
            'alliancesInvolved': battleData.reduce((acc, killmail) => {
                if (killmail.victim.alliance_id && !acc.includes(killmail.victim.alliance_id)) {
                    acc.push(killmail.victim.alliance_id);
                }
                for (const attacker of killmail.attackers) {
                    if (attacker.alliance_id && !acc.includes(attacker.alliance_id)) {
                        acc.push(attacker.alliance_id);
                    }
                }
                return acc;
            }, []), // Add initial empty array
            'corporationsInvolved': battleData.reduce((acc, killmail) => {
                if (killmail.victim.corporation_id && !acc.includes(killmail.victim.corporation_id)) {
                    acc.push(killmail.victim.corporation_id);
                }
                for (const attacker of killmail.attackers) {
                    if (attacker.corporation_id && !acc.includes(attacker.corporation_id)) {
                        acc.push(attacker.corporation_id);
                    }
                }
                return acc;
            }, []), // Add initial empty array
            'charactersInvolved': battleData.reduce((acc, killmail) => {
                if (killmail.victim.character_id && !acc.includes(killmail.victim.character_id)) {
                    acc.push(killmail.victim.character_id);
                }
                for (const attacker of killmail.attackers) {
                    if (attacker.character_id && !acc.includes(attacker.character_id)) {
                        acc.push(attacker.character_id);
                    }
                }
                return acc;
            }, []), // Add initial empty array
            ...teams,
        };

        cliLogger.info(`ℹ️  Found battle in system ${systemId} from ${battleStartTime.toISOString()} to ${battleEndTime.toISOString()} with ${battleData.length} killmails (hash: ${hash})`);

        await Battles.updateOne(
            { battle_id: battleId },
            {
                $set: {
                    ...battle,
                },
            },
            { upsert: true }
        );
    }
}
