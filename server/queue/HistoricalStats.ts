import { cliLogger } from "../helpers/Logger";
import { createQueue } from "../helpers/Queue";
import { CharacterAchievements } from "../models/CharacterAchievements";
import { Characters } from "../models/Characters";
import { HistoricalStats } from "../models/HistoricalStats";

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
 * Calculate change values based on historical counts
 */
function calculateChanges(
    currentCount: number,
    historicalCounts: Array<{ count: number; date: Date }>
) {
    const changes = {
        change_1d: null as number | null,
        change_7d: null as number | null,
        change_14d: null as number | null,
        change_30d: null as number | null,
    };

    const now = new Date();
    for (const historical of historicalCounts) {
        const daysDiff = Math.floor(
            (now.getTime() - historical.date.getTime()) / (1000 * 60 * 60 * 24)
        );

        if (daysDiff >= 1 && daysDiff <= 2 && changes.change_1d === null) {
            changes.change_1d = currentCount - historical.count;
        }
        if (daysDiff >= 7 && daysDiff <= 9 && changes.change_7d === null) {
            changes.change_7d = currentCount - historical.count;
        }
        if (daysDiff >= 14 && daysDiff <= 16 && changes.change_14d === null) {
            changes.change_14d = currentCount - historical.count;
        }
        if (daysDiff >= 30 && daysDiff <= 32 && changes.change_30d === null) {
            changes.change_30d = currentCount - historical.count;
        }
    }

    return changes;
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
        cliLogger.info(
            `📊 Processing alliance ${allianceId} historical stats (${memberCount} members)`
        );

        // Log warning for very large alliances
        if (memberCount > 20000) {
            cliLogger.info(
                `⚠️  Large alliance detected (${memberCount} members) - using optimized processing`
            );
        }

        const previousStats = await HistoricalStats.findOne({
            alliance_id: allianceId,
            corporation_id: 0,
        });

        // Fix: Properly maintain 30-day historical counts by adding CURRENT count
        let historicalCounts = [];
        if (previousStats) {
            historicalCounts = (previousStats as any).historicalCounts || [];
        }

        // Add current count to the beginning of the array
        historicalCounts.unshift({
            count: memberCount,
            date: currentDate,
        });

        // Keep only the last 30 entries
        if (historicalCounts.length > 30) {
            historicalCounts = historicalCounts.slice(0, 30);
        }

        // Calculate change values based on historical data
        const changes = calculateChanges(
            memberCount,
            historicalCounts.slice(1)
        ); // Skip current entry for comparison

        // OPTIMIZATION: Split into separate queries for large alliances to avoid $lookup performance issues
        // Security status stats - fast aggregation without joins
        const securityStatsResult = await Characters.aggregate(
            [
                { $match: { alliance_id: allianceId } },
                {
                    $group: {
                        _id: null,
                        sum_sec_status: { $sum: "$security_status" },
                        avg_sec_status: { $avg: "$security_status" },
                        pirate_members: {
                            $sum: {
                                $cond: [
                                    { $lt: ["$security_status", -1.5] },
                                    1,
                                    0,
                                ],
                            },
                        },
                        carebear_members: {
                            $sum: {
                                $cond: [
                                    { $gt: ["$security_status", 1.5] },
                                    1,
                                    0,
                                ],
                            },
                        },
                        neutral_members: {
                            $sum: {
                                $cond: [
                                    {
                                        $and: [
                                            {
                                                $gte: [
                                                    "$security_status",
                                                    -1.5,
                                                ],
                                            },
                                            { $lte: ["$security_status", 1.5] },
                                        ],
                                    },
                                    1,
                                    0,
                                ],
                            },
                        },
                        character_ids: { $push: "$character_id" }, // Collect character IDs for achievement lookup
                    },
                },
            ],
            { allowDiskUse: true }
        ); // Allow disk use for large alliances

        let secStats = {
            sum_sec_status: 0,
            avg_sec_status: 0,
            pirate_members: 0,
            carebear_members: 0,
            neutral_members: 0,
        };

        let characterIds: number[] = [];
        if (securityStatsResult && securityStatsResult.length > 0) {
            const stats = securityStatsResult[0];
            secStats = {
                sum_sec_status: stats.sum_sec_status || 0,
                avg_sec_status: stats.avg_sec_status || 0,
                pirate_members: stats.pirate_members || 0,
                carebear_members: stats.carebear_members || 0,
                neutral_members: stats.neutral_members || 0,
            };
            characterIds = stats.character_ids || [];
        }

        // Achievement stats - separate optimized query using character IDs
        let achievementStats = {
            total_achievement_points: 0,
            avg_achievement_points: 0,
            top_achievement_character_id: null,
            top_achievement_character_points: 0,
        };

        if (characterIds.length > 0) {
            // Process in batches for very large alliances to avoid MongoDB query size limits
            const batchSize = 10000; // Process 10k character IDs at a time
            let totalPoints = 0;
            let membersWithAchievements = 0;
            let topCharacterId = null;
            let topCharacterPoints = 0;

            const totalBatches = Math.ceil(characterIds.length / batchSize);
            if (totalBatches > 1) {
                cliLogger.info(
                    `🔄 Processing ${characterIds.length} character achievements in ${totalBatches} batches`
                );
            }

            for (let i = 0; i < characterIds.length; i += batchSize) {
                const batch = characterIds.slice(i, i + batchSize);
                const batchNum = Math.floor(i / batchSize) + 1;

                if (totalBatches > 1) {
                    cliLogger.info(
                        `   Processing batch ${batchNum}/${totalBatches} (${batch.length} characters)`
                    );
                }

                // Get achievement stats for this batch
                const batchAchievements = await CharacterAchievements.aggregate(
                    [
                        { $match: { character_id: { $in: batch } } },
                        {
                            $group: {
                                _id: null,
                                total_points: { $sum: "$total_points" },
                                count: { $sum: 1 },
                                max_points: { $max: "$total_points" },
                            },
                        },
                    ],
                    { allowDiskUse: true }
                );

                if (batchAchievements && batchAchievements.length > 0) {
                    const batchStats = batchAchievements[0];
                    totalPoints += batchStats.total_points || 0;
                    membersWithAchievements += batchStats.count || 0;

                    // Check if this batch has the new top character
                    if (batchStats.max_points > topCharacterPoints) {
                        const topInBatch = await CharacterAchievements.findOne(
                            {
                                character_id: { $in: batch },
                                total_points: batchStats.max_points,
                            },
                            { character_id: 1, total_points: 1 }
                        );
                        if (topInBatch) {
                            topCharacterPoints = (topInBatch as any)
                                .total_points;
                            topCharacterId = (topInBatch as any).character_id;
                        }
                    }
                }
            }

            achievementStats = {
                total_achievement_points: totalPoints,
                avg_achievement_points:
                    membersWithAchievements > 0
                        ? totalPoints / membersWithAchievements
                        : 0,
                top_achievement_character_id: topCharacterId,
                top_achievement_character_points: topCharacterPoints,
            };
        }

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
                    // Add the calculated change fields
                    ...changes,
                },
            },
            { upsert: true }
        );

        cliLogger.info(
            `✅ Processed alliance ${allianceId}: ${memberCount} members, ${achievementStats.total_achievement_points} achievement points`
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
            `📊 Processing corporation ${corporationId} historical stats (${memberCount} members)`
        );

        // Log warning for very large corporations
        if (memberCount > 10000) {
            cliLogger.info(
                `⚠️  Large corporation detected (${memberCount} members) - using optimized processing`
            );
        }

        const previousStats = await HistoricalStats.findOne({
            corporation_id: corporationId,
            alliance_id: 0,
        });

        // Fix: Properly maintain 30-day historical counts by adding CURRENT count
        let historicalCounts = [];
        if (previousStats) {
            historicalCounts = (previousStats as any).historicalCounts || [];
        }

        // Add current count to the beginning of the array
        historicalCounts.unshift({
            count: memberCount,
            date: currentDate,
        });

        // Keep only the last 30 entries
        if (historicalCounts.length > 30) {
            historicalCounts = historicalCounts.slice(0, 30);
        }

        // Calculate change values based on historical data
        const changes = calculateChanges(
            memberCount,
            historicalCounts.slice(1)
        ); // Skip current entry for comparison

        // OPTIMIZATION: Split into separate queries for large corporations to avoid $lookup performance issues
        // Security status stats - fast aggregation without joins
        const securityStatsResult = await Characters.aggregate(
            [
                { $match: { corporation_id: corporationId } },
                {
                    $group: {
                        _id: null,
                        sum_sec_status: { $sum: "$security_status" },
                        avg_sec_status: { $avg: "$security_status" },
                        pirate_members: {
                            $sum: {
                                $cond: [
                                    { $lt: ["$security_status", -1.5] },
                                    1,
                                    0,
                                ],
                            },
                        },
                        carebear_members: {
                            $sum: {
                                $cond: [
                                    { $gt: ["$security_status", 1.5] },
                                    1,
                                    0,
                                ],
                            },
                        },
                        neutral_members: {
                            $sum: {
                                $cond: [
                                    {
                                        $and: [
                                            {
                                                $gte: [
                                                    "$security_status",
                                                    -1.5,
                                                ],
                                            },
                                            { $lte: ["$security_status", 1.5] },
                                        ],
                                    },
                                    1,
                                    0,
                                ],
                            },
                        },
                        character_ids: { $push: "$character_id" }, // Collect character IDs for achievement lookup
                    },
                },
            ],
            { allowDiskUse: true }
        ); // Allow disk use for large corporations

        let secStats = {
            sum_sec_status: 0,
            avg_sec_status: 0,
            pirate_members: 0,
            carebear_members: 0,
            neutral_members: 0,
        };

        let characterIds: number[] = [];
        if (securityStatsResult && securityStatsResult.length > 0) {
            const stats = securityStatsResult[0];
            secStats = {
                sum_sec_status: stats.sum_sec_status || 0,
                avg_sec_status: stats.avg_sec_status || 0,
                pirate_members: stats.pirate_members || 0,
                carebear_members: stats.carebear_members || 0,
                neutral_members: stats.neutral_members || 0,
            };
            characterIds = stats.character_ids || [];
        }

        // Achievement stats - separate optimized query using character IDs
        let achievementStats = {
            total_achievement_points: 0,
            avg_achievement_points: 0,
            top_achievement_character_id: null,
            top_achievement_character_points: 0,
        };

        if (characterIds.length > 0) {
            // Process in batches for very large corporations to avoid MongoDB query size limits
            const batchSize = 10000; // Process 10k character IDs at a time
            let totalPoints = 0;
            let membersWithAchievements = 0;
            let topCharacterId = null;
            let topCharacterPoints = 0;

            const totalBatches = Math.ceil(characterIds.length / batchSize);
            if (totalBatches > 1) {
                cliLogger.info(
                    `🔄 Processing ${characterIds.length} character achievements in ${totalBatches} batches`
                );
            }

            for (let i = 0; i < characterIds.length; i += batchSize) {
                const batch = characterIds.slice(i, i + batchSize);
                const batchNum = Math.floor(i / batchSize) + 1;

                if (totalBatches > 1) {
                    cliLogger.info(
                        `   Processing batch ${batchNum}/${totalBatches} (${batch.length} characters)`
                    );
                }

                // Get achievement stats for this batch
                const batchAchievements = await CharacterAchievements.aggregate(
                    [
                        { $match: { character_id: { $in: batch } } },
                        {
                            $group: {
                                _id: null,
                                total_points: { $sum: "$total_points" },
                                count: { $sum: 1 },
                                max_points: { $max: "$total_points" },
                            },
                        },
                    ],
                    { allowDiskUse: true }
                );

                if (batchAchievements && batchAchievements.length > 0) {
                    const batchStats = batchAchievements[0];
                    totalPoints += batchStats.total_points || 0;
                    membersWithAchievements += batchStats.count || 0;

                    // Check if this batch has the new top character
                    if (batchStats.max_points > topCharacterPoints) {
                        const topInBatch = await CharacterAchievements.findOne(
                            {
                                character_id: { $in: batch },
                                total_points: batchStats.max_points,
                            },
                            { character_id: 1, total_points: 1 }
                        );
                        if (topInBatch) {
                            topCharacterPoints = (topInBatch as any)
                                .total_points;
                            topCharacterId = (topInBatch as any).character_id;
                        }
                    }
                }
            }

            achievementStats = {
                total_achievement_points: totalPoints,
                avg_achievement_points:
                    membersWithAchievements > 0
                        ? totalPoints / membersWithAchievements
                        : 0,
                top_achievement_character_id: topCharacterId,
                top_achievement_character_points: topCharacterPoints,
            };
        }

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
                    // Add the calculated change fields
                    ...changes,
                },
            },
            { upsert: true }
        );

        cliLogger.info(
            `✅ Processed corporation ${corporationId}: ${memberCount} members, ${achievementStats.total_achievement_points} achievement points`
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
    hasQueuedJobs,
    processAllianceHistoricalStats,
    processCorporationHistoricalStats,
    processHistoricalStats,
    queueHistoricalStatsProcessing,
    queueHistoricalStatsProcessingBulk,
};
