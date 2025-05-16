import type { IFullStats, IStatsDocument, StatsType } from '~/server/interfaces/IStats';
import { InvTypes } from '~/server/models/InvTypes';
import { Killmails } from "~/server/models/Killmails";
import { Stats } from "~/server/models/Stats";
import { IKillmail } from '../interfaces/IKillmail';

export async function updateStatsOnKillmailProcessing(killmail: IKillmail): Promise<void> {
    const involvedEntities: { type: StatsType; id: number }[] = [];
    const killTime = new Date(killmail.kill_time);

    // Add victim entities
    if (killmail.victim.character_id) {
        involvedEntities.push({ type: "character_id", id: killmail.victim.character_id });
    }
    if (killmail.victim.corporation_id) {
        involvedEntities.push({ type: "corporation_id", id: killmail.victim.corporation_id });
    }
    if (killmail.victim.alliance_id) {
        involvedEntities.push({ type: "alliance_id", id: killmail.victim.alliance_id });
    }

    // Add attacker entities
    for (const attacker of killmail.attackers) {
        if (attacker.character_id) {
            involvedEntities.push({ type: "character_id", id: attacker.character_id });
        }
        if (attacker.corporation_id) {
            involvedEntities.push({ type: "corporation_id", id: attacker.corporation_id });
        }
        if (attacker.alliance_id) {
            involvedEntities.push({ type: "alliance_id", id: attacker.alliance_id });
        }
    }

    // Deduplicate entities
    const uniqueEntities = involvedEntities.filter(
        (entity, index, self) =>
            index === self.findIndex((e) => e.type === entity.type && e.id === entity.id)
    );

    const timePeriodsToUpdate = [0]; // Always update all-time stats
    const now = Date.now();
    if (now - killTime.getTime() < 14 * 24 * 60 * 60 * 1000) {
        timePeriodsToUpdate.push(14);
    }
    if (now - killTime.getTime() < 30 * 24 * 60 * 60 * 1000) {
        timePeriodsToUpdate.push(30);
    }
    if (now - killTime.getTime() < 90 * 24 * 60 * 60 * 1000) {
        timePeriodsToUpdate.push(90);
    }

    for (const entity of uniqueEntities) {
        for (const days of timePeriodsToUpdate) {
            const update: any = { $set: { needsUpdate: true, updatedAt: new Date() }, $inc: {} };

            // Determine if this entity was a victim or an attacker in this specific killmail
            const isVictim = killmail.victim.character_id === entity.id && entity.type === "character_id" ||
                killmail.victim.corporation_id === entity.id && entity.type === "corporation_id" ||
                killmail.victim.alliance_id === entity.id && entity.type === "alliance_id";

            if (isVictim) {
                update.$inc.losses = 1;
                update.$inc.iskLost = killmail.total_value;
                if (killmail.is_npc) {
                    update.$inc.npcLosses = 1;
                }
                if (killmail.is_solo) {
                    update.$inc.soloLosses = 1;
                }
            } else {
                // Check if this entity is among the attackers
                const attackerInfo = killmail.attackers.find(a =>
                    (a.character_id === entity.id && entity.type === "character_id") ||
                    (a.corporation_id === entity.id && entity.type === "corporation_id") ||
                    (a.alliance_id === entity.id && entity.type === "alliance_id")
                );
                if (attackerInfo) {
                    update.$inc.kills = 1;
                    update.$inc.iskKilled = killmail.total_value;
                    if (killmail.is_solo) {
                        update.$inc.soloKills = 1;
                    }
                }
            }

            // Update lastActive, ensuring it's only set if the killTime is more recent
            update.$set.lastActive = killTime > (await Stats.findOne({ type: entity.type, id: entity.id, days: days }, { lastActive: 1 })?.lean()?.then(s => s?.lastActive) || new Date(0)) ? killTime : undefined;
            if (update.$set.lastActive === undefined) delete update.$set.lastActive; // don't set if not newer

            if (Object.keys(update.$inc).length > 0) { // Only update if there are increments
                await Stats.findOneAndUpdate(
                    { type: entity.type, id: entity.id, days: days },
                    update,
                    { upsert: true, setDefaultsOnInsert: true }
                );
            }
        }
    }
}

/**
 * Calculates all stats for an entity and returns a single object with all root fields and full sub-object.
 * Optimized version for entities with large numbers of killmails.
 */
export async function calculateAllStats(type: StatsType, id: number, days: number): Promise<IStatsDocument> {
    if (days < 0) {
        days = 90;
    }

    // Initialize heat map
    const heatMap: Record<string, number> = {};
    for (let i = 0; i < 24; i++) {
        const hourString = `h${i.toString().padStart(2, "0")}`;
        heatMap[hourString] = 0;
    }

    // Initialize full stats structure with empty defaults
    const full: IFullStats = {
        mostUsedShips: {},
        mostLostShips: {},
        diesToCorporations: {},
        diesToAlliances: {},
        blobFactor: 0,
        heatMap,
        fliesWithCorporations: {},
        fliesWithAlliances: {},
        sameShipAsOtherAttackers: 0,
        possibleFC: false,
        possibleCynoAlt: false,
    };

    // Set up time filter
    const timeFilter = days > 0
        ? { $gte: new Date(Date.now() - days * 24 * 60 * 60 * 1000) }
        : undefined;

    // Run base stats calculations in parallel for better performance
    const [
        basicStats,
        shipStats,
        heatMapData,
    ] = await Promise.all([
        getBasicStats(type, id, timeFilter),
        getShipStats(type, id, timeFilter),
        getHeatMapData(type, id, timeFilter),
    ]);

    // Process character-specific stats only if needed
    const characterSpecificStats = type === 'character_id'
        ? await getCharacterSpecificStats(id, timeFilter, basicStats.kills)
        : { possibleFC: false, possibleCynoAlt: false };

    // Only calculate these for characters
    let blobFactorData = { blobCount: 0 };
    if (type === 'character_id') {
        blobFactorData = await getBlobFactorData(type, id, timeFilter);
    }

    // Process basic stats
    const kills = basicStats.kills || 0;
    const losses = basicStats.losses || 0;
    const iskKilled = basicStats.iskKilled || 0;
    const iskLost = basicStats.iskLost || 0;
    const soloKills = basicStats.soloKills || 0;
    const soloLosses = basicStats.soloLosses || 0;
    const npcLosses = basicStats.npcLosses || 0;
    const lastActive = basicStats.lastActive;

    // Process ship stats
    if (shipStats.mostUsedShips) {
        full.mostUsedShips = shipStats.mostUsedShips;
    }

    if (shipStats.mostLostShips) {
        full.mostLostShips = shipStats.mostLostShips;
    }

    // Process heat map
    if (heatMapData && heatMapData.length > 0) {
        heatMapData.forEach(hourData => {
            const hourKey = `h${hourData._id.toString().padStart(2, "0")}`;
            full.heatMap[hourKey] = hourData.count;
        });
    }

    // Process blob factor for characters only
    if (type === 'character_id' && kills > 0 && blobFactorData && blobFactorData.blobCount) {
        full.blobFactor = (blobFactorData.blobCount / kills) * 100;
    }

    // Apply character-specific checks
    if (type === 'character_id') {
        full.possibleFC = characterSpecificStats.possibleFC;
        full.possibleCynoAlt = characterSpecificStats.possibleCynoAlt;
    }

    // Clean up unnecessary fields based on entity type
    if (type !== 'character_id') {
        // Remove character-specific fields for corps and alliances
        full.diesToCorporations = {};
        full.diesToAlliances = {};
        full.fliesWithCorporations = {};
        full.fliesWithAlliances = {};
        full.possibleFC = false;
        full.possibleCynoAlt = false;
    }

    return {
        type,
        id,
        days,
        kills,
        losses,
        iskKilled,
        iskLost,
        npcLosses,
        soloKills,
        soloLosses,
        lastActive,
        full,
        updatedAt: new Date(),
    };
}

/**
 * Get character-specific stats like possibleFC and possibleCynoAlt
 */
async function getCharacterSpecificStats(id: number, timeFilter?: { $gte: Date }, kills: number = 0): Promise<{ possibleFC: boolean, possibleCynoAlt: boolean }> {
    // Prepare match condition for losses
    const lossMatchCondition: any = { "victim.character_id": id };
    if (timeFilter) {
        lossMatchCondition.kill_time = timeFilter;
    }

    // Check for Monitor ship (ID 45534) for FC detection
    const monitorLoss = await Killmails.countDocuments({
        ...lossMatchCondition,
        "victim.ship_id": 45534
    });

    // Check for possible cyno alt
    let possibleCynoAlt = false;

    // Only check cyno modules if character has few kills
    if (kills < 25) {
        // Cyno items IDs: 28646, 21096, 52694
        const CYNO_MODULE_IDS = [28646, 21096, 52694];
        const cynoCutoff = new Date("2019-09-01T00:00:00Z");

        // Only check kills after Sep 1, 2019
        const cynoLossMatchCondition = {
            ...lossMatchCondition,
            kill_time: { $gte: cynoCutoff },
            "items.type_id": { $in: CYNO_MODULE_IDS }
        };

        const cynoModuleLosses = await Killmails.countDocuments(cynoLossMatchCondition);
        possibleCynoAlt = cynoModuleLosses > 0;
    }

    return {
        possibleFC: monitorLoss > 0,
        possibleCynoAlt
    };
}

/**
 * Get basic kill and loss statistics using individual optimized queries
 */
async function getBasicStats(type: StatsType, id: number, timeFilter?: { $gte: Date }) {
    // Prepare match conditions
    const killMatchCondition: any = { [`attackers.${type}`]: id };
    const lossMatchCondition: any = { [`victim.${type}`]: id };

    if (timeFilter) {
        killMatchCondition.kill_time = timeFilter;
        lossMatchCondition.kill_time = timeFilter;
    }

    // Check if we need sampling by doing a quick count
    const quickCountKills = await Killmails.countDocuments(killMatchCondition).limit(1000);
    const needsSampling = quickCountKills >= 1000;

    // Define sample size and sampling threshold
    const SAMPLE_SIZE = 100000;

    // Create optimized queries for iskKilled and iskLost - the most expensive operations
    const iskKilledPipeline = [];
    const iskLostPipeline = [];

    // Apply sampling for very large datasets (especially alliances)
    if (needsSampling) {
        iskKilledPipeline.push({ $match: killMatchCondition }, { $sample: { size: SAMPLE_SIZE } });
        iskLostPipeline.push({ $match: lossMatchCondition }, { $sample: { size: SAMPLE_SIZE } });
    } else {
        iskKilledPipeline.push({ $match: killMatchCondition });
        iskLostPipeline.push({ $match: lossMatchCondition });
    }

    // Complete the aggregation pipelines
    iskKilledPipeline.push({ $group: { _id: null, total: { $sum: "$total_value" }, count: { $sum: 1 } } });
    iskLostPipeline.push({ $group: { _id: null, total: { $sum: "$total_value" }, count: { $sum: 1 } } });

    // Run all queries in parallel for better performance
    const [
        // Kill stats - individual optimized queries
        kills,
        iskKilledResult,
        soloKillsCount,
        lastActiveKill,

        // Loss stats - individual optimized queries
        losses,
        iskLostResult,
        soloLossesCount,
        npcLossesCount,
        lastActiveLoss
    ] = await Promise.all([
        // Kills count - simple count operation
        Killmails.countDocuments(killMatchCondition),

        // ISK killed - optimized with sampling when needed
        Killmails.aggregate(iskKilledPipeline).allowDiskUse(true),

        // Solo kills - use optimized pipeline for large datasets
        needsSampling
            ? getSampledCountWithCondition(killMatchCondition, "is_solo", true, SAMPLE_SIZE)
            : Killmails.countDocuments({ ...killMatchCondition, is_solo: true }),

        // Last active kill - single document query with sort
        Killmails.findOne(killMatchCondition, { kill_time: 1, _id: 0 })
            .sort({ kill_time: -1 })
            .lean(),

        // Losses count - simple count operation
        Killmails.countDocuments(lossMatchCondition),

        // ISK lost - optimized with sampling when needed
        Killmails.aggregate(iskLostPipeline).allowDiskUse(true),

        // Solo losses - use optimized pipeline for large datasets
        needsSampling
            ? getSampledCountWithCondition(lossMatchCondition, "is_solo", true, SAMPLE_SIZE)
            : Killmails.countDocuments({ ...lossMatchCondition, is_solo: true }),

        // NPC losses - use optimized pipeline for large datasets
        needsSampling
            ? getSampledCountWithCondition(lossMatchCondition, "is_npc", true, SAMPLE_SIZE)
            : Killmails.countDocuments({ ...lossMatchCondition, is_npc: true }),

        // Last active loss - single document query with sort
        Killmails.findOne(lossMatchCondition, { kill_time: 1, _id: 0 })
            .sort({ kill_time: -1 })
            .lean()
    ]);

    // Process results, handling sampled data appropriately
    let iskKilled = 0;
    let iskLost = 0;
    let soloKills = soloKillsCount;
    let soloLosses = soloLossesCount;
    let npcLosses = npcLossesCount;

    // Process ISK killed with scaling if sampling was used
    if (iskKilledResult.length > 0) {
        if (needsSampling) {
            // Scale the result based on the sampling ratio
            const samplingRatio = kills / iskKilledResult[0].count;
            iskKilled = iskKilledResult[0].total * samplingRatio;
        } else {
            iskKilled = iskKilledResult[0].total;
        }
    }

    // Process ISK lost with scaling if sampling was used
    if (iskLostResult.length > 0) {
        if (needsSampling) {
            // Scale the result based on the sampling ratio
            const samplingRatio = losses / iskLostResult[0].count;
            iskLost = iskLostResult[0].total * samplingRatio;
        } else {
            iskLost = iskLostResult[0].total;
        }
    }

    // Determine last active time from both kills and losses
    const lastActiveFromKills = lastActiveKill ? lastActiveKill.kill_time : null;
    const lastActiveFromLosses = lastActiveLoss ? lastActiveLoss.kill_time : null;

    let lastActive = null;
    if (lastActiveFromKills && lastActiveFromLosses) {
        lastActive = new Date(Math.max(lastActiveFromKills.getTime(), lastActiveFromLosses.getTime()));
    } else if (lastActiveFromKills) {
        lastActive = lastActiveFromKills;
    } else if (lastActiveFromLosses) {
        lastActive = lastActiveFromLosses;
    }

    return {
        kills,
        losses,
        iskKilled,
        iskLost,
        soloKills,
        soloLosses,
        npcLosses,
        lastActive
    };
}

/**
 * Helper function to get a count with a condition using sampling for large datasets
 */
async function getSampledCountWithCondition(baseCondition: any, field: string, value: any, sampleSize: number): Promise<number> {
    const pipeline = [
        { $match: baseCondition },
        { $sample: { size: sampleSize } },
        { $match: { [field]: value } },
        { $count: "count" }
    ];

    const [sampleResult, totalResult] = await Promise.all([
        Killmails.aggregate(pipeline).allowDiskUse(true),
        Killmails.countDocuments(baseCondition)
    ]);

    if (sampleResult.length === 0) return 0;

    // Calculate the approximate total based on the sample ratio
    const sampleCount = sampleResult[0].count;
    const totalCount = totalResult;

    // If we got fewer results than the sample size, the sample is the full dataset
    if (totalCount <= sampleSize) {
        return sampleCount;
    }

    // Scale up based on the ratio of total records to sampled records
    const samplingRatio = totalCount / sampleSize;
    return Math.round(sampleCount * samplingRatio);
}

/**
 * Get ship statistics for both kills and losses
 * Optimized with sampling for extremely large datasets and early ship filtering
 */
async function getShipStats(type: StatsType, id: number, timeFilter?: { $gte: Date }) {
    // Prepare match conditions
    const killMatchCondition: any = { [`attackers.${type}`]: id };
    const lossMatchCondition: any = { [`victim.${type}`]: id };

    if (timeFilter) {
        killMatchCondition.kill_time = timeFilter;
        lossMatchCondition.kill_time = timeFilter;
    }

    // Get all valid ship type IDs upfront (category_id = 6)
    const shipTypes = await InvTypes.find(
        { category_id: 6 },
        { type_id: 1, _id: 0 }
    ).lean();

    // Create an array of valid ship type IDs
    const validShipIds = shipTypes.map(item => item.type_id);

    // Check if we need to sample (for extremely large datasets)
    const totalKillCount = await Killmails.countDocuments(killMatchCondition).limit(1000000);
    const totalLossCount = await Killmails.countDocuments(lossMatchCondition).limit(1000000);

    // Define sampling rates based on data size
    const SAMPLE_THRESHOLD = 100000;
    const useSamplingForKills = totalKillCount > SAMPLE_THRESHOLD;
    const useSamplingForLosses = totalLossCount > SAMPLE_THRESHOLD;

    // Limit to top 200 ships (most common)
    const SHIP_LIMIT = 20;

    // Ship usage statistics from kills pipeline
    const killsPipeline = [];

    // Add sampling stage for large datasets
    if (useSamplingForKills) {
        const sampleSize = Math.min(SAMPLE_THRESHOLD, Math.max(10000, Math.floor(totalKillCount * 0.1)));
        killsPipeline.push({ $sample: { size: sampleSize } });
    } else {
        killsPipeline.push({ $match: killMatchCondition });
    }

    // Continue with the rest of the pipeline, now with early ship filtering
    killsPipeline.push(
        { $unwind: "$attackers" },
        {
            $match: {
                [`attackers.${type}`]: id,
                "attackers.ship_id": { $in: validShipIds } // Early ship filtering
            }
        },
        {
            $group: {
                _id: "$attackers.ship_id",
                count: { $sum: 1 },
                name: { $first: "$attackers.ship_name" }
            }
        },
        { $match: { _id: { $ne: 0 } } },
        { $sort: { count: -1 } },
        { $limit: SHIP_LIMIT }
    );

    // Ship loss statistics pipeline with early ship filtering
    const lossesPipeline = [];

    // Add sampling stage for large datasets
    if (useSamplingForLosses) {
        const sampleSize = Math.min(SAMPLE_THRESHOLD, Math.max(10000, Math.floor(totalLossCount * 0.1)));
        lossesPipeline.push({ $sample: { size: sampleSize } });
    } else {
        lossesPipeline.push({ $match: lossMatchCondition });
    }

    // Add early ship filtering to losses pipeline
    lossesPipeline.push(
        {
            $match: {
                "victim.ship_id": { $in: validShipIds } // Early ship filtering
            }
        },
        {
            $group: {
                _id: "$victim.ship_id",
                count: { $sum: 1 },
                name: { $first: "$victim.ship_name" }
            }
        },
        { $match: { _id: { $ne: 0 } } },
        { $sort: { count: -1 } },
        { $limit: SHIP_LIMIT }
    );

    // Run aggregations in parallel
    const [mostUsedShipsAgg, mostLostShipsAgg] = await Promise.all([
        Killmails.aggregate(killsPipeline).allowDiskUse(true),
        Killmails.aggregate(lossesPipeline).allowDiskUse(true)
    ]);

    // Process ship usage data - no need to filter again since we did it in the pipeline
    const mostUsedShips: Record<number, { count: number; name: any }> = {};
    mostUsedShipsAgg.forEach(ship => {
        if (ship._id) {
            mostUsedShips[ship._id] = {
                count: ship.count,
                name: ship.name || { en: "" }
            };
        }
    });

    // Process ship loss data - no need to filter again since we did it in the pipeline
    const mostLostShips: Record<number, { count: number; name: any }> = {};
    mostLostShipsAgg.forEach(ship => {
        if (ship._id) {
            mostLostShips[ship._id] = {
                count: ship.count,
                name: ship.name || { en: "" }
            };
        }
    });

    return { mostUsedShips, mostLostShips };
}

/**
 * Get heat map data (kills by hour) with sampling for large datasets
 */
async function getHeatMapData(type: StatsType, id: number, timeFilter?: { $gte: Date }) {
    const matchCondition: any = { [`attackers.${type}`]: id };

    if (timeFilter) {
        matchCondition.kill_time = timeFilter;
    }

    // Check if we need to sample (for extremely large datasets)
    const totalCount = await Killmails.countDocuments(matchCondition).limit(1000000);

    // Apply sampling for large datasets
    const SAMPLE_THRESHOLD = 100000;
    const useSampling = totalCount > SAMPLE_THRESHOLD;

    const pipeline = [];

    // Add sampling for large datasets
    if (useSampling) {
        const sampleSize = Math.min(SAMPLE_THRESHOLD, Math.max(10000, Math.floor(totalCount * 0.1)));
        pipeline.push({ $sample: { size: sampleSize } });
    } else {
        pipeline.push({ $match: matchCondition });
    }

    // Add the hour grouping stage
    pipeline.push({
        $group: {
            _id: { $hour: "$kill_time" },
            count: { $sum: 1 }
        }
    });

    return Killmails.aggregate(pipeline).allowDiskUse(true);
}

/**
 * Get blob factor data with sampling for large datasets
 */
async function getBlobFactorData(type: StatsType, id: number, timeFilter?: { $gte: Date }) {
    const matchCondition: any = { [`attackers.${type}`]: id };

    if (timeFilter) {
        matchCondition.kill_time = timeFilter;
    }

    // Check if we need to sample (for extremely large datasets)
    const totalCount = await Killmails.countDocuments(matchCondition).limit(1000000);

    // Apply sampling for large datasets
    const SAMPLE_THRESHOLD = 100000;
    const useSampling = totalCount > SAMPLE_THRESHOLD;

    const pipeline = [];

    // Add sampling for large datasets
    if (useSampling) {
        const sampleSize = Math.min(SAMPLE_THRESHOLD, Math.max(10000, Math.floor(totalCount * 0.1)));
        pipeline.push({ $sample: { size: sampleSize } });
    } else {
        pipeline.push({ $match: matchCondition });
    }

    // Continue with the rest of the pipeline
    pipeline.push(
        {
            $project: {
                attackersCount: { $size: "$attackers" }
            }
        },
        {
            $match: { attackersCount: { $gt: 10 } }
        },
        {
            $count: "blobCount"
        }
    );

    const result = await Killmails.aggregate(pipeline).allowDiskUse(true);

    // Adjust the blob count if we used sampling
    if (useSampling && result.length > 0) {
        const samplingRatio = totalCount / Math.min(SAMPLE_THRESHOLD, Math.max(10000, Math.floor(totalCount * 0.1)));
        return { blobCount: Math.round(result[0].blobCount * samplingRatio) };
    }

    return result[0] || { blobCount: 0 };
}

