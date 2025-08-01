import {
    compileFullBattleData,
    determineTeamsFromKillmails,
} from "../server/helpers/Battles";
import { cliLogger } from "../server/helpers/Logger";
import type { IKillmail } from "../server/interfaces/IKillmail";
import { Battles } from "../server/models/Battles";
import { Killmails } from "../server/models/Killmails";

// CAPSULE_IDS removed

// getTopEntities function removed
// getTopShipTypes function removed

export default {
    name: "backfillBattles",
    description: "Find battles and backfill them in the database",
    longRunning: false,
    run: async () => {
        const firstKillmail = await Killmails.findOne(
            {},
            { kill_time: 1 },
            { sort: { killmail_id: 1 } }
        );
        const lastKillmail = await Killmails.findOne(
            {},
            { kill_time: 1 },
            { sort: { killmail_id: -1 } }
        );

        const startTime = new Date(firstKillmail?.kill_time || 0);
        const endTime = new Date(lastKillmail?.kill_time || 0);

        cliLogger.info(
            `ℹ️  Backfilling battles from ${startTime.toISOString()} to ${endTime.toISOString()}`
        );

        let fromTime = new Date(startTime.getTime() - 3600 * 1000);
        let toTime = new Date(startTime.getTime() + 3600 * 1000);

        do {
            // Pipeline to find systems with significant activity (potential battles)
            const pipeline: any[] = [
                // Using any[] for Mongoose aggregate typing flexibility
                {
                    $match: {
                        kill_time: { $gte: fromTime, $lt: toTime },
                    },
                },
                {
                    $group: {
                        _id: "$system_id", // Group by system
                        count: { $sum: 1 }, // Count killmails per system
                    },
                },
                {
                    $match: {
                        count: { $gte: 10 }, // Filter for systems with at least 10 killmails
                    },
                },
                {
                    $sort: { count: -1 as -1 }, // Sort by killmail count descending
                },
            ];

            const potentialBattles = await Killmails.aggregate(pipeline, {
                allowDiskUse: true,
                hint: "kill_time_-1",
            });

            if (potentialBattles.length > 0) {
                for (const battle of potentialBattles) {
                    // Process each identified potential battle system
                    await processPotentialBattle(battle._id, fromTime, toTime);
                }
            }

            fromTime = toTime; // Move to the next time window
            toTime = new Date(toTime.getTime() + 3600 * 1000); // Advance by 1 hour
        } while (fromTime < endTime);
    },
};

/**
 * Processes killmails within a given system and time frame to define and store a battle.
 */
async function processPotentialBattle(
    systemId: number,
    fromTime: Date,
    toTime: Date
) {
    let extensibleToTime = new Date(toTime.getTime());
    let segmentStart = new Date(fromTime.getTime());
    let segmentEnd = new Date(fromTime.getTime() + 5 * 60 * 1000); // 5-minute segments
    let foundStart = false;
    let foundEnd = false;
    let battleStartTime: Date = new Date(0);
    let battleEndTime: Date = new Date(0);
    let failCounter = 0; // Counts consecutive inactive segments
    const killCountToConsider = 5; // Minimum kills in a segment to be considered active part of a battle

    // Determine the actual start and end times of the battle based on activity
    do {
        const killCount = await Killmails.countDocuments(
            {
                kill_time: { $gte: segmentStart, $lt: segmentEnd },
                system_id: systemId,
            },
            { allowDiskUse: true, hint: "system_id_kill_time" }
        );

        if (killCount >= killCountToConsider) {
            if (!foundStart) {
                foundStart = true;
                battleStartTime = new Date(segmentStart.getTime());
            }
            failCounter = 0; // Reset counter on activity
        } else {
            failCounter++;
        }

        if (
            segmentEnd >= extensibleToTime &&
            killCount >= killCountToConsider
        ) {
            cliLogger.info(
                `ℹ️  Extending battle search window for system ${systemId} due to ongoing activity.`
            );
            extensibleToTime = new Date(segmentEnd.getTime() + 30 * 60 * 1000); // Extend by 30 minutes
        }

        segmentStart = new Date(segmentStart.getTime() + 5 * 60 * 1000);
        segmentEnd = new Date(segmentEnd.getTime() + 5 * 60 * 1000);

        if (failCounter === 6) {
            foundEnd = true;
            battleEndTime = new Date(
                segmentStart.getTime() - 6 * 5 * 60 * 1000
            );
            break;
        }
    } while (segmentEnd < extensibleToTime);

    if (!foundEnd && foundStart) {
        battleEndTime = new Date(extensibleToTime.getTime());
        foundEnd = true;
    }

    if (foundStart && foundEnd) {
        if (battleEndTime <= battleStartTime) {
            cliLogger.info(
                `ℹ️  Battle in system ${systemId} has zero or negative duration, skipping.`
            );
            return;
        }

        // Retrieve all killmails for the determined battle period
        // Project fields needed by compileFullBattleData and its internal helpers
        const battleData: IKillmail[] = (await Killmails.find(
            {
                kill_time: { $gte: battleStartTime, $lt: battleEndTime },
                system_id: systemId,
            },
            {
                _id: 0,
                killmail_id: 1,
                kill_time: 1,
                system_id: 1,
                total_value: 1,
                victim: 1,
                attackers: 1,
            }
        ).lean()) as IKillmail[];

        if (battleData.length < killCountToConsider) {
            cliLogger.info(
                `ℹ️  Not enough killmails (${battleData.length}) for a significant battle in system ${systemId}, skipping.`
            );
            return;
        }

        const battleSides = await determineTeamsFromKillmails(battleData);
        const battleDocument = await compileFullBattleData(
            battleData,
            [systemId],
            battleStartTime,
            battleEndTime,
            undefined,
            battleSides
        );

        // Skip if battle already exists
        const exists = await Battles.exists({
            battle_id: battleDocument.battle_id,
        });
        if (exists) {
            cliLogger.info(
                `⚠️  Battle ${battleDocument.battle_id} already exists, skipping.`
            );
        } else {
            cliLogger.info(
                `ℹ️  Inserting new battle ${
                    battleDocument.battle_id
                } for system ${systemId}. Start: ${battleStartTime.toISOString()}, End: ${battleEndTime.toISOString()}`
            );
            await Battles.create(battleDocument);
        }
    }
}
