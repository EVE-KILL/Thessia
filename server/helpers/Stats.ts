import type {
    IFullStats,
    IStatsDocument,
    StatsType,
} from "~/server/interfaces/IStats";
import { InvTypes } from "~/server/models/InvTypes";
import { Killmails } from "~/server/models/Killmails";
import { Stats } from "~/server/models/Stats";
import { IKillmail } from "../interfaces/IKillmail";

/**
 * Validates that the entity type is a valid StatsType and entity ID is valid
 * to prevent problematic database queries
 */
function validateEntity(
    type: StatsType | undefined,
    id: number | undefined
): {
    valid: boolean;
    type: StatsType;
    id: number;
} {
    const validTypes = ["character_id", "corporation_id", "alliance_id"];
    const defaultType: StatsType = "character_id";

    // Check type validity
    if (!type || !validTypes.includes(type)) {
        console.error(
            `Invalid entity type: ${type}. Skipping entity processing.`
        );
        return { valid: false, type: defaultType, id: 0 };
    }

    // Check ID validity
    if (id === undefined || id === null || isNaN(id) || id <= 0) {
        console.error(
            `Invalid entity ID: ${id} for type ${type}. Skipping entity processing.`
        );
        return { valid: false, type, id: 0 };
    }

    return { valid: true, type, id };
}

export async function updateStatsOnKillmailProcessing(
    killmail: IKillmail
): Promise<void> {
    const involvedEntities: { type: StatsType; id: number }[] = [];
    const killTime = new Date(killmail.kill_time);

    // Add victim entities
    if (killmail.victim.character_id) {
        involvedEntities.push({
            type: "character_id",
            id: killmail.victim.character_id,
        });
    }
    if (killmail.victim.corporation_id) {
        involvedEntities.push({
            type: "corporation_id",
            id: killmail.victim.corporation_id,
        });
    }
    if (killmail.victim.alliance_id) {
        involvedEntities.push({
            type: "alliance_id",
            id: killmail.victim.alliance_id,
        });
    }

    // Add attacker entities
    for (const attacker of killmail.attackers) {
        if (attacker.character_id) {
            involvedEntities.push({
                type: "character_id",
                id: attacker.character_id,
            });
        }
        if (attacker.corporation_id) {
            involvedEntities.push({
                type: "corporation_id",
                id: attacker.corporation_id,
            });
        }
        if (attacker.alliance_id) {
            involvedEntities.push({
                type: "alliance_id",
                id: attacker.alliance_id,
            });
        }
    }

    // Deduplicate entities
    const uniqueEntities = involvedEntities.filter(
        (entity, index, self) =>
            index ===
            self.findIndex((e) => e.type === entity.type && e.id === entity.id)
    );

    // Filter out any entities with undefined type or id (additional safeguard)
    const validEntities = uniqueEntities.filter(
        (entity) =>
            entity.type &&
            entity.id &&
            typeof entity.id === "number" &&
            entity.id > 0
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

    for (const entity of validEntities) {
        // Validate entity to prevent attackers.undefined queries
        const validation = validateEntity(entity.type, entity.id);
        if (!validation.valid) {
            continue; // Skip this entity if validation failed
        }

        const validType = validation.type;
        const validId = validation.id;

        for (const days of timePeriodsToUpdate) {
            const update: any = {
                $set: { needsUpdate: true, updatedAt: new Date() },
                $inc: {},
            };

            // Determine if this entity was a victim or an attacker in this specific killmail
            const isVictim =
                (killmail.victim.character_id === validId &&
                    validType === "character_id") ||
                (killmail.victim.corporation_id === validId &&
                    validType === "corporation_id") ||
                (killmail.victim.alliance_id === validId &&
                    validType === "alliance_id");

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
                const attackerInfo = killmail.attackers.find(
                    (a) =>
                        (a.character_id === validId &&
                            validType === "character_id") ||
                        (a.corporation_id === validId &&
                            validType === "corporation_id") ||
                        (a.alliance_id === validId &&
                            validType === "alliance_id")
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
            update.$set.lastActive =
                killTime >
                ((await Stats.findOne(
                    { type: validType, id: validId, days: days },
                    { lastActive: 1 }
                )
                    ?.lean()
                    ?.then((s) => s?.lastActive)) || new Date(0))
                    ? killTime
                    : undefined;
            if (update.$set.lastActive === undefined)
                delete update.$set.lastActive; // don't set if not newer

            if (Object.keys(update.$inc).length > 0) {
                // Only update if there are increments
                await Stats.findOneAndUpdate(
                    { type: validType, id: validId, days: days },
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
export async function calculateAllStats(
    type: StatsType,
    id: number,
    days: number
): Promise<IStatsDocument> {
    // Validate entity parameters to prevent attackers.undefined queries
    const validation = validateEntity(type, id);
    if (!validation.valid) {
        // Return empty stats with valid: false indicator when validation fails
        console.log(
            `Skipping stats calculation for invalid entity: type=${type}, id=${id}`
        );

        // Initialize heat map for empty result
        const heatMap: Record<string, number> = {};
        for (let i = 0; i < 24; i++) {
            const hourString = `h${i.toString().padStart(2, "0")}`;
            heatMap[hourString] = 0;
        }

        // Return empty stats document
        return {
            type: validation.type,
            id: validation.id,
            days,
            kills: 0,
            losses: 0,
            iskKilled: 0,
            iskLost: 0,
            npcLosses: 0,
            soloKills: 0,
            soloLosses: 0,
            lastActive: null,
            full: {
                mostUsedShips: {},
                mostLostShips: {},
                shipGroupStats: [],
                monthlyStats: [],
                diesToCorporations: {},
                diesToAlliances: {},
                blobFactor: 0,
                heatMap,
                fliesWithCorporations: {},
                fliesWithAlliances: {},
                sameShipAsOtherAttackers: 0,
                possibleFC: false,
                possibleCynoAlt: false,
            },
            updatedAt: new Date(),
        };
    }

    // Use validated values
    type = validation.type;
    id = validation.id;

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
        shipGroupStats: [],
        monthlyStats: [],
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
    const timeFilter =
        days > 0
            ? { $gte: new Date(Date.now() - days * 24 * 60 * 60 * 1000) }
            : undefined;

    // Early check: Determine if there are any killmails at all for this entity
    const killMatchCondition: any = { [`attackers.${type}`]: id };
    const lossMatchCondition: any = { [`victim.${type}`]: id };

    if (timeFilter) {
        killMatchCondition.kill_time = timeFilter;
        lossMatchCondition.kill_time = timeFilter;
    }

    // Check if there are any kills or losses for this entity
    const [killsExist, lossesExist] = await Promise.all([
        Killmails.countDocuments(killMatchCondition).limit(1).lean(),
        Killmails.countDocuments(lossMatchCondition).limit(1).lean(),
    ]);

    // If there are no kills and no losses, return zero stats immediately
    if (killsExist === 0 && lossesExist === 0) {
        return {
            type,
            id,
            days,
            kills: 0,
            losses: 0,
            iskKilled: 0,
            iskLost: 0,
            npcLosses: 0,
            soloKills: 0,
            soloLosses: 0,
            lastActive: null,
            full,
            updatedAt: new Date(),
        };
    }

    // Run base stats calculations in parallel for better performance
    const [basicStats, shipGroupStats, monthlyStats, heatMapData, mostUsedShips, mostLostShips] =
        await Promise.all([
            getBasicStats(type, id, timeFilter),
            getShipGroupStats(type, id, timeFilter),
            getMonthlyStats(type, id, timeFilter),
            getHeatMapData(type, id, timeFilter),
            getMostUsedShips(type, id, timeFilter),
            getMostLostShips(type, id, timeFilter),
        ]);

    // Process character-specific stats only if needed
    const characterSpecificStats =
        type === "character_id"
            ? await getCharacterSpecificStats(id, timeFilter, basicStats.kills)
            : { possibleFC: false, possibleCynoAlt: false };

    // Only calculate these for characters
    let blobFactorData = { blobCount: 0 };
    if (type === "character_id") {
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
    if (shipGroupStats && shipGroupStats.length > 0) {
        full.shipGroupStats = shipGroupStats;
    }

    // Process most used ships
    if (mostUsedShips && Object.keys(mostUsedShips).length > 0) {
        full.mostUsedShips = mostUsedShips;
    }

    // Process most lost ships
    if (mostLostShips && Object.keys(mostLostShips).length > 0) {
        full.mostLostShips = mostLostShips;
    }

    // Process monthly stats
    if (monthlyStats && monthlyStats.length > 0) {
        full.monthlyStats = monthlyStats;
    }

    // Process heat map
    if (heatMapData && heatMapData.length > 0) {
        heatMapData.forEach((hourData) => {
            const hourKey = `h${hourData._id.toString().padStart(2, "0")}`;
            full.heatMap[hourKey] = hourData.count;
        });
    }

    // Process blob factor for characters only
    if (
        type === "character_id" &&
        kills > 0 &&
        blobFactorData &&
        blobFactorData.blobCount
    ) {
        full.blobFactor = (blobFactorData.blobCount / kills) * 100;
    }

    // Apply character-specific checks
    if (type === "character_id") {
        full.possibleFC = characterSpecificStats.possibleFC;
        full.possibleCynoAlt = characterSpecificStats.possibleCynoAlt;
    }

    // Clean up unnecessary fields based on entity type
    if (type !== "character_id") {
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
async function getCharacterSpecificStats(
    id: number,
    timeFilter?: { $gte: Date },
    kills: number = 0
): Promise<{ possibleFC: boolean; possibleCynoAlt: boolean }> {
    // Validate ID before proceeding
    if (!id || isNaN(id) || id <= 0) {
        console.error(
            `Invalid character ID: ${id}. Skipping character-specific stats.`
        );
        return { possibleFC: false, possibleCynoAlt: false };
    }

    // Prepare match condition for losses
    const lossMatchCondition: any = { "victim.character_id": id };
    if (timeFilter) {
        lossMatchCondition.kill_time = timeFilter;
    }

    // Check for Monitor ship (ID 45534) for FC detection
    const monitorLoss = await Killmails.countDocuments({
        ...lossMatchCondition,
        "victim.ship_id": 45534,
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
            "items.type_id": { $in: CYNO_MODULE_IDS },
        };

        const cynoModuleLosses = await Killmails.countDocuments(
            cynoLossMatchCondition
        );
        possibleCynoAlt = cynoModuleLosses > 0;
    }

    return {
        possibleFC: monitorLoss > 0,
        possibleCynoAlt,
    };
}

/**
 * Get basic kill and loss statistics using individual optimized queries
 */
async function getBasicStats(
    type: StatsType,
    id: number,
    timeFilter?: { $gte: Date }
) {
    // Validate entity parameters to prevent attackers.undefined queries
    const validation = validateEntity(type, id);
    if (!validation.valid) {
        console.error(`Invalid entity for basic stats: type=${type}, id=${id}`);
        return {
            kills: 0,
            losses: 0,
            iskKilled: 0,
            iskLost: 0,
            soloKills: 0,
            soloLosses: 0,
            npcLosses: 0,
            lastActive: null,
        };
    }

    // Use validated values
    type = validation.type;
    id = validation.id;

    // Prepare match conditions
    const killMatchCondition: any = { [`attackers.${type}`]: id };
    const lossMatchCondition: any = { [`victim.${type}`]: id };

    if (timeFilter) {
        killMatchCondition.kill_time = timeFilter;
        lossMatchCondition.kill_time = timeFilter;
    }

    // Check if we need sampling by doing a quick count
    const quickCountKills = await Killmails.countDocuments(
        killMatchCondition
    ).limit(1000);
    const needsSampling = quickCountKills >= 1000;

    // Define sample size and sampling threshold
    const SAMPLE_SIZE = 100000;

    // Create optimized queries for iskKilled and iskLost - the most expensive operations
    const iskKilledPipeline = [];
    const iskLostPipeline = [];

    // Apply sampling for very large datasets (especially alliances)
    if (needsSampling) {
        iskKilledPipeline.push(
            { $match: killMatchCondition },
            { $sample: { size: SAMPLE_SIZE } }
        );
        iskLostPipeline.push(
            { $match: lossMatchCondition },
            { $sample: { size: SAMPLE_SIZE } }
        );
    } else {
        iskKilledPipeline.push({ $match: killMatchCondition });
        iskLostPipeline.push({ $match: lossMatchCondition });
    }

    // Complete the aggregation pipelines
    iskKilledPipeline.push({
        $group: {
            _id: null,
            total: { $sum: "$total_value" },
            count: { $sum: 1 },
        },
    });
    iskLostPipeline.push({
        $group: {
            _id: null,
            total: { $sum: "$total_value" },
            count: { $sum: 1 },
        },
    });

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
        lastActiveLoss,
    ] = await Promise.all([
        // Kills count - simple count operation
        Killmails.countDocuments(killMatchCondition),

        // ISK killed - optimized with sampling when needed
        Killmails.aggregate(iskKilledPipeline).allowDiskUse(true),

        // Solo kills - use optimized pipeline for large datasets
        needsSampling
            ? getSampledCountWithCondition(
                  killMatchCondition,
                  "is_solo",
                  true,
                  SAMPLE_SIZE
              )
            : Killmails.countDocuments({
                  ...killMatchCondition,
                  is_solo: true,
              }),

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
            ? getSampledCountWithCondition(
                  lossMatchCondition,
                  "is_solo",
                  true,
                  SAMPLE_SIZE
              )
            : Killmails.countDocuments({
                  ...lossMatchCondition,
                  is_solo: true,
              }),

        // NPC losses - use optimized pipeline for large datasets
        needsSampling
            ? getSampledCountWithCondition(
                  lossMatchCondition,
                  "is_npc",
                  true,
                  SAMPLE_SIZE
              )
            : Killmails.countDocuments({ ...lossMatchCondition, is_npc: true }),

        // Last active loss - single document query with sort
        Killmails.findOne(lossMatchCondition, { kill_time: 1, _id: 0 })
            .sort({ kill_time: -1 })
            .lean(),
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
    const lastActiveFromKills = lastActiveKill
        ? lastActiveKill.kill_time
        : null;
    const lastActiveFromLosses = lastActiveLoss
        ? lastActiveLoss.kill_time
        : null;

    let lastActive = null;
    if (lastActiveFromKills && lastActiveFromLosses) {
        lastActive = new Date(
            Math.max(
                lastActiveFromKills.getTime(),
                lastActiveFromLosses.getTime()
            )
        );
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
        lastActive,
    };
}

/**
 * Helper function to get a count with a condition using sampling for large datasets
 */
async function getSampledCountWithCondition(
    baseCondition: any,
    field: string,
    value: any,
    sampleSize: number
): Promise<number> {
    const pipeline = [
        { $match: baseCondition },
        { $sample: { size: sampleSize } },
        { $match: { [field]: value } },
        { $count: "count" },
    ];

    const [sampleResult, totalResult] = await Promise.all([
        Killmails.aggregate(pipeline).allowDiskUse(true),
        Killmails.countDocuments(baseCondition),
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
 * Get ship group statistics (like the API endpoints expect)
 * Returns kills, losses, and efficiency per ship group
 */
async function getShipGroupStats(
    type: StatsType,
    id: number,
    timeFilter?: { $gte: Date }
) {
    // Validate entity parameters to prevent attackers.undefined queries
    const validation = validateEntity(type, id);
    if (!validation.valid) {
        console.error(
            `Invalid entity for ship group stats: type=${type}, id=${id}`
        );
        return [];
    }

    // Use validated values
    type = validation.type;
    id = validation.id;

    // Map type to database field
    const typeFieldMap: Record<string, string> = {
        character_id: "victim.character_id",
        corporation_id: "victim.corporation_id",
        alliance_id: "victim.alliance_id",
    };

    const attackerTypeFieldMap: Record<string, string> = {
        character_id: "attackers.character_id",
        corporation_id: "attackers.corporation_id",
        alliance_id: "attackers.alliance_id",
    };

    try {
        // Get all valid ship type IDs upfront (category_id = 6)
        const shipTypes = await InvTypes.find(
            { category_id: 6 },
            { type_id: 1, type_name: 1, _id: 0 }
        ).lean();

        // Create maps for quick lookup
        const shipIdToName = new Map<number, string>();
        const validShipIds = shipTypes.map((ship) => {
            shipIdToName.set(
                ship.type_id,
                ship.type_name?.en || "Unknown Ship"
            );
            return ship.type_id;
        });

        // Prepare match conditions
        const killMatchCondition: any = { [attackerTypeFieldMap[type]]: id };
        const lossMatchCondition: any = { [typeFieldMap[type]]: id };

        if (timeFilter) {
            killMatchCondition.kill_time = timeFilter;
            lossMatchCondition.kill_time = timeFilter;
        }

        // Aggregate ship usage from kills (where entity is attacker)
        const killsAggregation = [
            {
                $match: killMatchCondition,
            },
            { $unwind: "$attackers" },
            {
                $match: {
                    [`attackers.${
                        type === "character_id"
                            ? "character_id"
                            : type === "corporation_id"
                            ? "corporation_id"
                            : "alliance_id"
                    }`]: id,
                    "attackers.ship_id": { $in: validShipIds },
                },
            },
            {
                $group: {
                    _id: "$attackers.ship_id",
                    kills: { $sum: 1 },
                },
            },
        ];

        // Aggregate ship losses (where entity is victim)
        const lossesAggregation = [
            {
                $match: {
                    ...lossMatchCondition,
                    "victim.ship_id": { $in: validShipIds },
                },
            },
            {
                $group: {
                    _id: "$victim.ship_id",
                    losses: { $sum: 1 },
                },
            },
        ];

        const [killResults, lossResults] = await Promise.all([
            Killmails.aggregate(killsAggregation).allowDiskUse(true),
            Killmails.aggregate(lossesAggregation).allowDiskUse(true),
        ]);

        // Combine results
        const shipStatsMap = new Map<
            number,
            {
                groupName: string;
                kills: number;
                losses: number;
                efficiency: number;
            }
        >();

        // Process kills
        killResults.forEach((result) => {
            const shipId = result._id;
            if (shipId && shipIdToName.has(shipId)) {
                shipStatsMap.set(shipId, {
                    groupName: shipIdToName.get(shipId)!,
                    kills: result.kills,
                    losses: 0,
                    efficiency: 0,
                });
            }
        });

        // Process losses
        lossResults.forEach((result) => {
            const shipId = result._id;
            if (shipId && shipIdToName.has(shipId)) {
                const existing = shipStatsMap.get(shipId);
                if (existing) {
                    existing.losses = result.losses;
                } else {
                    shipStatsMap.set(shipId, {
                        groupName: shipIdToName.get(shipId)!,
                        kills: 0,
                        losses: result.losses,
                        efficiency: 0,
                    });
                }
            }
        });

        // Calculate efficiency and convert to array
        const shipGroupStats = Array.from(shipStatsMap.values()).map((stat) => {
            const total = stat.kills + stat.losses;
            stat.efficiency =
                total > 0 ? Math.round((stat.kills / total) * 100) : 0;
            return stat;
        });

        // Sort by total activity (kills + losses) descending
        shipGroupStats.sort(
            (a, b) => b.kills + b.losses - (a.kills + a.losses)
        );

        return shipGroupStats;
    } catch (error) {
        console.error(
            `Error calculating ship group stats for ${type} ${id}:`,
            error
        );
        return [];
    }
}

/**
 * Get monthly statistics for an entity
 */
async function getMonthlyStats(
    type: StatsType,
    id: number,
    timeFilter?: { $gte: Date }
) {
    // Validate entity parameters to prevent attackers.undefined queries
    const validation = validateEntity(type, id);
    if (!validation.valid) {
        console.error(
            `Invalid entity for monthly stats: type=${type}, id=${id}`
        );
        return [];
    }

    // Use validated values
    type = validation.type;
    id = validation.id;

    // Map type to database field
    const typeFieldMap: Record<string, string> = {
        character_id: "victim.character_id",
        corporation_id: "victim.corporation_id",
        alliance_id: "victim.alliance_id",
    };

    const attackerTypeFieldMap: Record<string, string> = {
        character_id: "attackers.character_id",
        corporation_id: "attackers.corporation_id",
        alliance_id: "attackers.alliance_id",
    };

    // Get the earliest killmail date for this entity to determine how far back to go
    const [earliestLoss, earliestKill] = await Promise.all([
        Killmails.findOne({ [typeFieldMap[type]]: id })
            .sort({ kill_time: 1 })
            .select("kill_time")
            .lean(),
        Killmails.findOne({ [attackerTypeFieldMap[type]]: id })
            .sort({ kill_time: 1 })
            .select("kill_time")
            .lean(),
    ]);

    let earliestDate: Date | null = null;
    if (earliestLoss && earliestKill) {
        earliestDate = new Date(
            Math.min(
                earliestLoss.kill_time.getTime(),
                earliestKill.kill_time.getTime()
            )
        );
    } else if (earliestLoss) {
        earliestDate = earliestLoss.kill_time;
    } else if (earliestKill) {
        earliestDate = earliestKill.kill_time;
    }

    if (!earliestDate) {
        // No data found, return empty array
        return [];
    }

    // Apply time filter if provided
    const lossMatchCondition: any = { [typeFieldMap[type]]: id };
    const killMatchCondition: any = { [attackerTypeFieldMap[type]]: id };

    if (timeFilter) {
        lossMatchCondition.kill_time = timeFilter;
        killMatchCondition.kill_time = timeFilter;
    }

    // Aggregate losses (deaths) by month
    const lossesAggregation = [
        {
            $match: lossMatchCondition,
        },
        {
            $group: {
                _id: {
                    year: { $year: "$kill_time" },
                    month: { $month: "$kill_time" },
                },
                losses: { $sum: 1 },
                iskLost: { $sum: "$total_value" },
            },
        },
    ];

    // Aggregate kills (where entity is attacker) by month
    const killsAggregation = [
        {
            $match: killMatchCondition,
        },
        {
            $group: {
                _id: {
                    year: { $year: "$kill_time" },
                    month: { $month: "$kill_time" },
                },
                kills: { $sum: 1 },
                iskKilled: { $sum: "$total_value" },
            },
        },
    ];

    const [lossResults, killResults] = await Promise.all([
        Killmails.aggregate(lossesAggregation).allowDiskUse(true),
        Killmails.aggregate(killsAggregation).allowDiskUse(true),
    ]);

    // Create a map to combine results
    const monthsMap = new Map<string, any>();

    // Month names for display
    const monthNames = [
        "January",
        "February",
        "March",
        "April",
        "May",
        "June",
        "July",
        "August",
        "September",
        "October",
        "November",
        "December",
    ];

    // Process losses
    lossResults.forEach((result: any) => {
        if (!result._id) return;

        const year = result._id.year;
        const month = result._id.month;
        const key = `${year}-${month}`;

        if (!monthsMap.has(key)) {
            monthsMap.set(key, {
                year,
                month,
                monthLabel: `${monthNames[month - 1]} ${year}`,
                kills: 0,
                iskKilled: 0,
                losses: 0,
                iskLost: 0,
                efficiency: 0,
            });
        }

        const monthStat = monthsMap.get(key)!;
        monthStat.losses = result.losses || 0;
        monthStat.iskLost = result.iskLost || 0;
    });

    // Process kills
    killResults.forEach((result: any) => {
        if (!result._id) return;

        const year = result._id.year;
        const month = result._id.month;
        const key = `${year}-${month}`;

        if (!monthsMap.has(key)) {
            monthsMap.set(key, {
                year,
                month,
                monthLabel: `${monthNames[month - 1]} ${year}`,
                kills: 0,
                iskKilled: 0,
                losses: 0,
                iskLost: 0,
                efficiency: 0,
            });
        }

        const monthStat = monthsMap.get(key)!;
        monthStat.kills = result.kills || 0;
        monthStat.iskKilled = result.iskKilled || 0;
    });

    // Calculate efficiency and convert to array
    const monthlyStats = Array.from(monthsMap.values()).map((stat) => {
        const totalKills = stat.kills + stat.losses;
        stat.efficiency =
            totalKills > 0 ? Math.round((stat.kills / totalKills) * 100) : 0;
        return stat;
    });

    // Sort by year and month (newest first)
    monthlyStats.sort((a, b) => {
        if (a.year !== b.year) return b.year - a.year;
        return b.month - a.month;
    });

    return monthlyStats;
}

/**
 * Get heat map data (kills by hour) with sampling for large datasets
 */
async function getHeatMapData(
    type: StatsType,
    id: number,
    timeFilter?: { $gte: Date }
) {
    // Validate entity parameters to prevent attackers.undefined queries
    const validation = validateEntity(type, id);
    if (!validation.valid) {
        console.error(`Invalid entity for heat map: type=${type}, id=${id}`);
        return [];
    }

    // Use validated values
    type = validation.type;
    id = validation.id;

    const matchCondition: any = { [`attackers.${type}`]: id };

    if (timeFilter) {
        matchCondition.kill_time = timeFilter;
    }

    // Check if we need to sample (for extremely large datasets)
    const totalCount = await Killmails.countDocuments(matchCondition).limit(
        1000000
    );

    // Apply sampling for large datasets
    const SAMPLE_THRESHOLD = 100000;
    const useSampling = totalCount > SAMPLE_THRESHOLD;

    const pipeline = [];

    // Add sampling for large datasets
    if (useSampling) {
        const sampleSize = Math.min(
            SAMPLE_THRESHOLD,
            Math.max(10000, Math.floor(totalCount * 0.1))
        );
        pipeline.push({ $sample: { size: sampleSize } });
    } else {
        pipeline.push({ $match: matchCondition });
    }

    // Add the hour grouping stage
    pipeline.push({
        $group: {
            _id: { $hour: "$kill_time" },
            count: { $sum: 1 },
        },
    });

    return Killmails.aggregate(pipeline).allowDiskUse(true);
}

/**
 * Get blob factor data with sampling for large datasets
 */
async function getBlobFactorData(
    type: StatsType,
    id: number,
    timeFilter?: { $gte: Date }
) {
    // Validate entity parameters to prevent attackers.undefined queries
    const validation = validateEntity(type, id);
    if (!validation.valid) {
        console.error(`Invalid entity for blob factor: type=${type}, id=${id}`);
        return { blobCount: 0 };
    }

    // Use validated values
    type = validation.type;
    id = validation.id;

    const matchCondition: any = { [`attackers.${type}`]: id };

    if (timeFilter) {
        matchCondition.kill_time = timeFilter;
    }

    // Check if we need to sample (for extremely large datasets)
    const totalCount = await Killmails.countDocuments(matchCondition).limit(
        1000000
    );

    // Apply sampling for large datasets
    const SAMPLE_THRESHOLD = 100000;
    const useSampling = totalCount > SAMPLE_THRESHOLD;

    const pipeline = [];

    // Add sampling for large datasets
    if (useSampling) {
        const sampleSize = Math.min(
            SAMPLE_THRESHOLD,
            Math.max(10000, Math.floor(totalCount * 0.1))
        );
        pipeline.push({ $sample: { size: sampleSize } });
    } else {
        pipeline.push({ $match: matchCondition });
    }

    // Continue with the rest of the pipeline
    pipeline.push(
        {
            $project: {
                attackersCount: { $size: "$attackers" },
            },
        },
        {
            $match: { attackersCount: { $gt: 10 } },
        },
        {
            $count: "blobCount",
        }
    );

    const result = await Killmails.aggregate(pipeline).allowDiskUse(true);

    // Adjust the blob count if we used sampling
    if (useSampling && result.length > 0) {
        const samplingRatio =
            totalCount /
            Math.min(
                SAMPLE_THRESHOLD,
                Math.max(10000, Math.floor(totalCount * 0.1))
            );
        return { blobCount: Math.round(result[0].blobCount * samplingRatio) };
    }

    return result[0] || { blobCount: 0 };
}

/**
 * Get most used ships statistics with sampling for large datasets
 */
async function getMostUsedShips(type: StatsType, id: number, timeFilter?: { $gte: Date }) {
    // Validate entity parameters to prevent attackers.undefined queries
    const validation = validateEntity(type, id);
    if (!validation.valid) {
        console.error(`Invalid entity for most used ships: type=${type}, id=${id}`);
        return {};
    }

    // Use validated values
    type = validation.type;
    id = validation.id;

    // Prepare match conditions
    const killMatchCondition: any = { [`attackers.${type}`]: id };

    if (timeFilter) {
        killMatchCondition.kill_time = timeFilter;
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

    // Define sampling rates based on data size
    const SAMPLE_THRESHOLD = 100000;
    const useSamplingForKills = totalKillCount > SAMPLE_THRESHOLD;

    // Limit to top 20 ships (most common)
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

    // Run aggregation
    const mostUsedShipsAgg = await Killmails.aggregate(killsPipeline).allowDiskUse(true);

    // Process ship usage data
    const mostUsedShips: Record<number, { count: number; name: any }> = {};
    mostUsedShipsAgg.forEach(ship => {
        if (ship._id) {
            mostUsedShips[ship._id] = {
                count: ship.count,
                name: ship.name || { en: "" }
            };
        }
    });

    return mostUsedShips;
}

/**
 * Get most lost ships statistics with sampling for large datasets
 */
async function getMostLostShips(type: StatsType, id: number, timeFilter?: { $gte: Date }) {
    // Validate entity parameters to prevent attackers.undefined queries
    const validation = validateEntity(type, id);
    if (!validation.valid) {
        console.error(`Invalid entity for most lost ships: type=${type}, id=${id}`);
        return {};
    }

    // Use validated values
    type = validation.type;
    id = validation.id;

    // Prepare match conditions
    const lossMatchCondition: any = { [`victim.${type}`]: id };

    if (timeFilter) {
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
    const totalLossCount = await Killmails.countDocuments(lossMatchCondition).limit(1000000);

    // Define sampling rates based on data size
    const SAMPLE_THRESHOLD = 100000;
    const useSamplingForLosses = totalLossCount > SAMPLE_THRESHOLD;

    // Limit to top 20 ships (most common)
    const SHIP_LIMIT = 20;

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

    // Run aggregation
    const mostLostShipsAgg = await Killmails.aggregate(lossesPipeline).allowDiskUse(true);

    // Process ship loss data
    const mostLostShips: Record<number, { count: number; name: any }> = {};
    mostLostShipsAgg.forEach(ship => {
        if (ship._id) {
            mostLostShips[ship._id] = {
                count: ship.count,
                name: ship.name || { en: "" }
            };
        }
    });

    return mostLostShips;
}
