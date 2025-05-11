import { compileFullBattleData } from "~/server/helpers/Battles";
import { cliLogger } from "~/server/helpers/Logger";
import type { IKillmail } from "~/server/interfaces/IKillmail";
import { Battles } from "~/server/models/Battles";
import { Killmails } from "~/server/models/Killmails";

export default {
    name: "battlesFinder",
    description: "Finds battles for the past week and up to 4 hours ago",
    schedule: "0 * * * *",
    run: async () => {
        // Time window: from 7 days ago (rounded to hour) until 4 hours ago (rounded to hour)
        const now = new Date();
        // Round down to start of current hour
        now.setMinutes(0, 0, 0);
        const endTime = new Date(now.getTime() - 4 * 3600 * 1000);
        const startTime = new Date(now.getTime() - 7 * 24 * 3600 * 1000);
        cliLogger.info(
            `ℹ️  Finding battles from ${startTime.toISOString()} to ${endTime.toISOString()}`
        );

        // Slide 1-hour windows
        let fromTime = new Date(startTime.getTime() - 3600 * 1000);
        let toTime = new Date(startTime.getTime() + 3600 * 1000);

        while (fromTime < endTime) {
            // Aggregate killmails by system in this hour
            const pipeline: any[] = [
                { $match: { kill_time: { $gte: fromTime, $lt: toTime } } },
                { $group: { _id: '$system_id', count: { $sum: 1 } } },
                { $match: { count: { $gte: 10 } } },
                { $sort: { count: -1 } },
            ];
            const systems = await Killmails.aggregate(pipeline, {
                allowDiskUse: true,
                hint: 'kill_time_-1',
            });

            for (const sys of systems) {
                await processPotentialBattle(sys._id, fromTime, toTime);
            }

            fromTime = toTime;
            toTime = new Date(toTime.getTime() + 3600 * 1000);
        }
    },
};

// Process one system/time window to detect battle periods
async function processPotentialBattle(
    systemId: number,
    fromTime: Date,
    toTime: Date
) {
    // Extendable end based on activity
    let extensibleTo = new Date(toTime);
    let segmentStart = new Date(fromTime);
    let segmentEnd = new Date(fromTime.getTime() + 5 * 60 * 1000);

    let foundStart = false;
    let foundEnd = false;
    let failCount = 0;
    let battleStart = new Date(0);
    let battleEnd = new Date(0);
    const minKills = 5;

    // Slide 5-minute segments to find contiguous activity
    while (segmentEnd < extensibleTo) {
        const count = await Killmails.countDocuments(
            { kill_time: { $gte: segmentStart, $lt: segmentEnd }, system_id: systemId },
            { allowDiskUse: true, hint: 'system_id_-1_kill_time_-1' }
        );

        if (count >= minKills) {
            if (!foundStart) {
                foundStart = true;
                battleStart = new Date(segmentStart);
            }
            failCount = 0;
        } else {
            failCount++;
        }

        // Extend search window if ongoing activity
        if (segmentEnd >= extensibleTo && count >= minKills) {
            cliLogger.info(
                `ℹ️  Extending battle window for system ${systemId}`
            );
            extensibleTo = new Date(segmentEnd.getTime() + 30 * 60 * 1000);
        }

        if (failCount === 6) {
            foundEnd = true;
            battleEnd = new Date(
                segmentStart.getTime() - 6 * 5 * 60 * 1000
            );
            break;
        }

        // Advance segment
        segmentStart = new Date(segmentStart.getTime() + 5 * 60 * 1000);
        segmentEnd = new Date(segmentEnd.getTime() + 5 * 60 * 1000);
    }

    if (!foundEnd && foundStart) {
        foundEnd = true;
        battleEnd = new Date(extensibleTo);
    }

    // If valid battle period found
    if (foundStart && foundEnd && battleEnd > battleStart) {
        const data = (await Killmails.find(
            { kill_time: { $gte: battleStart, $lt: battleEnd }, system_id: systemId },
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

        if (data.length >= minKills) {
            const doc = await compileFullBattleData(
                data,
                systemId,
                battleStart,
                battleEnd
            );

            // Skip if battle already exists
            const exists = await Battles.exists({ battle_id: doc.battle_id });
            if (exists) {
                cliLogger.info(`⚠️  Battle ${doc.battle_id} already exists, skipping.`);
            } else {
                cliLogger.info(
                    `⚔️ Battle ${doc.battle_id} in system ${systemId}, ${battleStart.toISOString()} - ${battleEnd.toISOString()}`
                );
                await Battles.create(doc);
            }
        }
    }
}
