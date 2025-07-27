import { cliLogger } from "../helpers/Logger";
import { createQueue } from "../helpers/Queue";
import { Characters } from "../models/Characters";
import { HistoricalStats } from "../models/HistoricalStats";
import { CharacterAchievements } from "../models/CharacterAchievements";

const historicalStatsQueue = createQueue("historicalStats");

/**
 * Check if there are any pending jobs in the historical stats queue
 * @returns Promise<boolean> - True if there are pending jobs, false otherwise
 */
async function hasQueuedJobs(): Promise<boolean> {
    const waiting = await historicalStatsQueue.getWaiting();
    const active = await historicalStatsQueue.getActive();
    const delayed = await historicalStatsQueue.getDelayed();

    const totalPending = waiting.length + active.length + delayed.length;
    cliLogger.info(
        `Historical stats queue status: ${totalPending} jobs pending (${waiting.length} waiting, ${active.length} active, ${delayed.length} delayed)`
    );

    return totalPending > 0;
}

/**
 * Queue a historical stats processing job for a specific entity
 * @param entityId - The alliance or corporation ID to process
 * @param entityType - Either 'alliance' or 'corporation'
 * @param memberCount - Number of members in the entity
 * @param currentDate - The date for this processing run
 * @param priority - Job priority (default: 1, higher numbers = higher priority)
 */
async function queueHistoricalStatsProcessing(
    entityId: number,
    entityType: "alliance" | "corporation",
    memberCount: number,
    currentDate: Date,
    priority = 1
) {
    await historicalStatsQueue.add(
        "historicalStats",
        {
            entityId,
            entityType,
            memberCount,
            currentDate,
        },
        {
            priority: priority,
            attempts: 3,
            backoff: {
                type: "exponential",
                delay: 5000, // 5 seconds
            },
            removeOnComplete: 10,
            removeOnFail: 25,
        }
    );
}

/**
 * Queue multiple historical stats processing jobs in bulk for better performance
 * @param entities - Array of entities to process (with id, type, memberCount)
 * @param currentDate - The date for this processing run
 * @param priority - Job priority (default: 1, higher numbers = higher priority)
 * @param batchSize - Number of jobs to add per batch (default: 100)
 */
async function queueHistoricalStatsProcessingBulk(
    entities: Array<{
        entityId: number;
        entityType: "alliance" | "corporation";
        memberCount: number;
    }>,
    currentDate: Date,
    priority = 1,
    batchSize = 1000
) {
    const jobs = entities.map((entity) => ({
        name: "historicalStats",
        data: {
            entityId: entity.entityId,
            entityType: entity.entityType,
            memberCount: entity.memberCount,
            currentDate,
        },
        opts: {
            priority: priority,
            attempts: 3,
            backoff: {
                type: "exponential",
                delay: 5000, // 5 seconds
            },
            removeOnComplete: 10,
            removeOnFail: 25,
        },
    }));

    // Process in batches to avoid overwhelming Redis
    for (let i = 0; i < jobs.length; i += batchSize) {
        const batch = jobs.slice(i, i + batchSize);
        await historicalStatsQueue.addBulk(batch);

        // Log progress for large batches
        if (jobs.length > batchSize) {
            cliLogger.info(
                `📋 Queued batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(
                    jobs.length / batchSize
                )} (${Math.min(i + batchSize, jobs.length)}/${
                    jobs.length
                } total jobs)`
            );
        }
    }
}

/**
 * Process historical stats for a single alliance
 */
async function processAllianceHistoricalStats(
    allianceId: number,
    memberCount: number,
    currentDate: Date
) {
    try {
        cliLogger.info(`📊 Processing alliance ${allianceId} historical stats`);

        const previousStats = await HistoricalStats.findOne({
            alliance_id: allianceId,
            corporation_id: 0,
        });

        let historicalCounts = [];
        if (previousStats) {
            historicalCounts = (previousStats as any).historicalCounts || [];
            historicalCounts.unshift({
                count: (previousStats as any).count,
                date: (previousStats as any).date,
            });
            if (historicalCounts.length > 30) {
                historicalCounts = historicalCounts.slice(0, 30);
            }
        }

        // Calculate security status stats
        let secStats = {
            sum_sec_status: 0,
            avg_sec_status: 0,
            pirate_members: 0,
            carebear_members: 0,
            neutral_members: 0,
        };

        const characterSecStats = await Characters.aggregate([
            { $match: { alliance_id: allianceId } },
            {
                $group: {
                    _id: null,
                    sum_sec_status: { $sum: "$security_status" },
                    avg_sec_status: { $avg: "$security_status" },
                    pirate_members: {
                        $sum: {
                            $cond: [{ $lt: ["$security_status", -1.5] }, 1, 0],
                        },
                    },
                    carebear_members: {
                        $sum: {
                            $cond: [{ $gt: ["$security_status", 1.5] }, 1, 0],
                        },
                    },
                    neutral_members: {
                        $sum: {
                            $cond: [
                                {
                                    $and: [
                                        { $gte: ["$security_status", -1.5] },
                                        { $lte: ["$security_status", 1.5] },
                                    ],
                                },
                                1,
                                0,
                            ],
                        },
                    },
                },
            },
        ]);

        if (characterSecStats && characterSecStats.length > 0) {
            secStats = characterSecStats[0];
        }

        // Calculate achievement stats
        let achievementStats = {
            total_achievement_points: 0,
            avg_achievement_points: 0,
            top_achievement_character_id: null,
            top_achievement_character_points: 0,
        };

        const characterCursor = Characters.find({ alliance_id: allianceId })
            .select("character_id")
            .cursor();

        let totalPoints = 0;
        let achievementMemberCount = 0;
        let topCharacterId = null;
        let topCharacterPoints = 0;

        for (
            let character = await characterCursor.next();
            character != null;
            character = await characterCursor.next()
        ) {
            const characterAchievement = await CharacterAchievements.findOne(
                { character_id: (character as any).character_id },
                { total_points: 1, character_id: 1 }
            );

            if (characterAchievement) {
                totalPoints += (characterAchievement as any).total_points;
                achievementMemberCount++;

                if (
                    (characterAchievement as any).total_points >
                    topCharacterPoints
                ) {
                    topCharacterPoints = (characterAchievement as any)
                        .total_points;
                    topCharacterId = (characterAchievement as any).character_id;
                }
            }
        }

        achievementStats.total_achievement_points = totalPoints;
        achievementStats.avg_achievement_points =
            achievementMemberCount > 0
                ? totalPoints / achievementMemberCount
                : 0;
        achievementStats.top_achievement_character_id = topCharacterId as any;
        achievementStats.top_achievement_character_points = topCharacterPoints;

        // Calculate weighted scores for pirate/carebear rankings
        const weightedScore = secStats.avg_sec_status * Math.log(memberCount);

        await HistoricalStats.updateOne(
            {
                alliance_id: allianceId,
                corporation_id: 0,
            },
            {
                $set: {
                    count: memberCount,
                    previousCount: (previousStats as any)?.count,
                    date: currentDate,
                    historicalCounts,
                    sum_sec_status: secStats.sum_sec_status,
                    avg_sec_status: secStats.avg_sec_status,
                    pirate_members: secStats.pirate_members,
                    carebear_members: secStats.carebear_members,
                    neutral_members: secStats.neutral_members,
                    weighted_score: weightedScore,
                    total_achievement_points:
                        achievementStats.total_achievement_points,
                    avg_achievement_points:
                        achievementStats.avg_achievement_points,
                    top_achievement_character_id:
                        achievementStats.top_achievement_character_id,
                    top_achievement_character_points:
                        achievementStats.top_achievement_character_points,
                },
            },
            { upsert: true }
        );

        cliLogger.info(
            `✅ Processed alliance ${allianceId}: ${memberCount} members, ${totalPoints} achievement points`
        );
        return true;
    } catch (error: any) {
        cliLogger.error(
            `💥 Failed to process alliance ${allianceId}: ${error.message}`
        );
        throw error;
    }
}

/**
 * Process historical stats for a single corporation
 */
async function processCorporationHistoricalStats(
    corporationId: number,
    memberCount: number,
    currentDate: Date
) {
    try {
        cliLogger.info(
            `📊 Processing corporation ${corporationId} historical stats`
        );

        const previousStats = await HistoricalStats.findOne({
            corporation_id: corporationId,
            alliance_id: 0,
        });

        let historicalCounts = [];
        if (previousStats) {
            historicalCounts = (previousStats as any).historicalCounts || [];
            historicalCounts.unshift({
                count: (previousStats as any).count,
                date: (previousStats as any).date,
            });
            if (historicalCounts.length > 30) {
                historicalCounts = historicalCounts.slice(0, 30);
            }
        }

        // Calculate security status stats
        let secStats = {
            sum_sec_status: 0,
            avg_sec_status: 0,
            pirate_members: 0,
            carebear_members: 0,
            neutral_members: 0,
        };

        const characterSecStats = await Characters.aggregate([
            { $match: { corporation_id: corporationId } },
            {
                $group: {
                    _id: null,
                    sum_sec_status: { $sum: "$security_status" },
                    avg_sec_status: { $avg: "$security_status" },
                    pirate_members: {
                        $sum: {
                            $cond: [{ $lt: ["$security_status", -1.5] }, 1, 0],
                        },
                    },
                    carebear_members: {
                        $sum: {
                            $cond: [{ $gt: ["$security_status", 1.5] }, 1, 0],
                        },
                    },
                    neutral_members: {
                        $sum: {
                            $cond: [
                                {
                                    $and: [
                                        { $gte: ["$security_status", -1.5] },
                                        { $lte: ["$security_status", 1.5] },
                                    ],
                                },
                                1,
                                0,
                            ],
                        },
                    },
                },
            },
        ]);

        if (characterSecStats && characterSecStats.length > 0) {
            secStats = characterSecStats[0];
        }

        // Calculate achievement stats
        let achievementStats = {
            total_achievement_points: 0,
            avg_achievement_points: 0,
            top_achievement_character_id: null,
            top_achievement_character_points: 0,
        };

        const characterCursor = Characters.find({
            corporation_id: corporationId,
        })
            .select("character_id")
            .cursor();

        let totalPoints = 0;
        let achievementMemberCount = 0;
        let topCharacterId = null;
        let topCharacterPoints = 0;

        for (
            let character = await characterCursor.next();
            character != null;
            character = await characterCursor.next()
        ) {
            const characterAchievement = await CharacterAchievements.findOne(
                { character_id: (character as any).character_id },
                { total_points: 1, character_id: 1 }
            );

            if (characterAchievement) {
                totalPoints += (characterAchievement as any).total_points;
                achievementMemberCount++;

                if (
                    (characterAchievement as any).total_points >
                    topCharacterPoints
                ) {
                    topCharacterPoints = (characterAchievement as any)
                        .total_points;
                    topCharacterId = (characterAchievement as any).character_id;
                }
            }
        }

        achievementStats.total_achievement_points = totalPoints;
        achievementStats.avg_achievement_points =
            achievementMemberCount > 0
                ? totalPoints / achievementMemberCount
                : 0;
        achievementStats.top_achievement_character_id = topCharacterId as any;
        achievementStats.top_achievement_character_points = topCharacterPoints;

        // Calculate weighted scores for pirate/carebear rankings
        const weightedScore = secStats.avg_sec_status * Math.log(memberCount);

        await HistoricalStats.updateOne(
            {
                corporation_id: corporationId,
                alliance_id: 0,
            },
            {
                $set: {
                    count: memberCount,
                    previousCount: (previousStats as any)?.count,
                    date: currentDate,
                    historicalCounts,
                    sum_sec_status: secStats.sum_sec_status,
                    avg_sec_status: secStats.avg_sec_status,
                    pirate_members: secStats.pirate_members,
                    carebear_members: secStats.carebear_members,
                    neutral_members: secStats.neutral_members,
                    weighted_score: weightedScore,
                    total_achievement_points:
                        achievementStats.total_achievement_points,
                    avg_achievement_points:
                        achievementStats.avg_achievement_points,
                    top_achievement_character_id:
                        achievementStats.top_achievement_character_id,
                    top_achievement_character_points:
                        achievementStats.top_achievement_character_points,
                },
            },
            { upsert: true }
        );

        cliLogger.info(
            `✅ Processed corporation ${corporationId}: ${memberCount} members, ${totalPoints} achievement points`
        );
        return true;
    } catch (error: any) {
        cliLogger.error(
            `💥 Failed to process corporation ${corporationId}: ${error.message}`
        );
        throw error;
    }
}

/**
 * Process historical stats for a single entity (alliance or corporation)
 */
async function processHistoricalStats(
    entityId: number,
    entityType: "alliance" | "corporation",
    memberCount: number,
    currentDate: Date
) {
    if (entityType === "alliance") {
        return await processAllianceHistoricalStats(
            entityId,
            memberCount,
            currentDate
        );
    } else {
        return await processCorporationHistoricalStats(
            entityId,
            memberCount,
            currentDate
        );
    }
}

export {
    queueHistoricalStatsProcessing,
    queueHistoricalStatsProcessingBulk,
    processHistoricalStats,
    processAllianceHistoricalStats,
    processCorporationHistoricalStats,
    hasQueuedJobs,
};
