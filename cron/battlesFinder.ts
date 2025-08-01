import {
    compileFullBattleData,
    determineTeamsFromKillmails,
} from "../server/helpers/Battles";
import { cliLogger } from "../server/helpers/Logger";
import type { IKillmail } from "../server/interfaces/IKillmail";
import { Battles } from "../server/models/Battles";
import { Killmails } from "../server/models/Killmails";

export default {
    name: "battlesFinder",
    description: "Finds battles for the past week and up to 4 hours ago",
    schedule: "0 * * * *",
    run: async () => {
        // Time window: from 7 days ago (rounded to hour) until 1 hour ago (rounded to hour)
        const now = new Date();
        // Round down to start of current hour
        now.setMinutes(0, 0, 0);
        const endTime = new Date(now.getTime() - 1 * 3600 * 1000);
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
                { $group: { _id: "$system_id", count: { $sum: 1 } } },
                { $match: { count: { $gte: 10 } } },
                { $sort: { count: -1 } },
            ];
            const systems = await Killmails.aggregate(pipeline, {
                allowDiskUse: true,
                hint: "kill_time_-1",
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
            {
                kill_time: { $gte: segmentStart, $lt: segmentEnd },
                system_id: systemId,
            },
            { allowDiskUse: true, hint: "system_id_kill_time" }
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
            battleEnd = new Date(segmentStart.getTime() - 6 * 5 * 60 * 1000);
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
            {
                kill_time: { $gte: battleStart, $lt: battleEnd },
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

        if (data.length >= minKills) {
            const battleSides = await determineTeamsFromKillmails(data);
            const doc = await compileFullBattleData(
                data,
                [systemId],
                battleStart,
                battleEnd,
                undefined,
                battleSides
            );

            // Collapse into overlapping existing battle
            // Updated to use the new model structure with systems array
            const overlapping = await Battles.findOne({
                "systems.system_id": systemId,
                start_time: { $lt: doc.end_time },
                end_time: { $gt: doc.start_time },
            });

            if (overlapping) {
                if (overlapping.battle_id !== doc.battle_id) {
                    cliLogger.info(
                        `🔄 Merging battle ${doc.battle_id} into existing ${
                            overlapping.battle_id
                        } for system ${systemId} from ${battleStart.toISOString()} to ${battleEnd.toISOString()}`
                    );
                }

                // Create a new update object without the battle_id to avoid duplicate key errors
                const updateDoc = { ...doc };
                delete updateDoc.battle_id; // Keep the original battle_id

                // Properly merge systems arrays to avoid duplicates
                if (overlapping.systems && updateDoc.systems) {
                    // Create a Set of system IDs already in the battle
                    const existingSystemIds = new Set(
                        overlapping.systems.map((sys) => sys.system_id)
                    );

                    // Only add systems that don't already exist
                    updateDoc.systems = [
                        ...overlapping.systems,
                        ...updateDoc.systems.filter(
                            (sys) => !existingSystemIds.has(sys.system_id)
                        ),
                    ];
                }

                // Merge killmail IDs to avoid duplicates
                if (overlapping.killmail_ids && updateDoc.killmail_ids) {
                    const allKillmailIds = new Set([
                        ...overlapping.killmail_ids,
                        ...updateDoc.killmail_ids,
                    ]);
                    updateDoc.killmail_ids = Array.from(allKillmailIds);
                }

                // Update involved entities counts
                updateDoc.involved_alliances_count =
                    updateDoc.alliancesInvolved?.length || 0;
                updateDoc.involved_corporations_count =
                    updateDoc.corporationsInvolved?.length || 0;
                updateDoc.involved_characters_count =
                    updateDoc.charactersInvolved?.length || 0;

                // Merge the sides data properly
                if (overlapping.sides && updateDoc.sides) {
                    const mergedSides = { ...overlapping.sides };

                    // Combine side data from both battles
                    for (const [sideId, sideData] of Object.entries(
                        updateDoc.sides
                    )) {
                        if (mergedSides[sideId]) {
                            // Side exists in both battles, merge their data
                            if (sideData.kill_ids) {
                                const uniqueKillIds = new Set([
                                    ...mergedSides[sideId].kill_ids,
                                    ...sideData.kill_ids,
                                ]);
                                mergedSides[sideId].kill_ids =
                                    Array.from(uniqueKillIds);
                            }

                            // Update stats
                            if (sideData.stats) {
                                mergedSides[sideId].stats.iskLost =
                                    (mergedSides[sideId].stats.iskLost || 0) +
                                    (sideData.stats.iskLost || 0);
                                mergedSides[sideId].stats.shipsLost =
                                    (mergedSides[sideId].stats.shipsLost || 0) +
                                    (sideData.stats.shipsLost || 0);
                                mergedSides[sideId].stats.damageInflicted =
                                    (mergedSides[sideId].stats
                                        .damageInflicted || 0) +
                                    (sideData.stats.damageInflicted || 0);
                            }

                            // Merge entity stats (simplified for brevity - in production you might want more sophisticated merging)
                            // This is a basic implementation that keeps the original stats
                        } else {
                            // Side only exists in the new battle, add it to merged sides
                            mergedSides[sideId] = sideData;
                        }
                    }

                    updateDoc.sides = mergedSides;
                }

                await Battles.updateOne(
                    { _id: overlapping._id },
                    { $set: updateDoc }
                );
            } else {
                cliLogger.info(
                    `ℹ️  Inserting new battle ${
                        doc.battle_id
                    } for system ${systemId} from ${battleStart.toISOString()} to ${battleEnd.toISOString()}`
                );
                await Battles.create(doc);
            }
        }
    }
}
