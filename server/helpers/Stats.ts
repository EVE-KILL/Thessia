import * as RuntimeCache from "./RuntimeCache";

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

    if (validEntities.length === 0) {
        console.warn(
            `No valid entities found in killmail ${killmail.killmail_id}. Skipping stats update.`
        );
        return;
    }

    // Group entities by type for efficient batch updates
    const entityTypes = ["character_id", "corporation_id", "alliance_id"];
    const killDate = new Date(killTime.getTime());

    // Calculate cutoff dates for recent activity
    const now = new Date();
    const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);

    for (const entityType of entityTypes) {
        const entitiesOfType = validEntities.filter(
            (e) => e.type === entityType
        );
        if (entitiesOfType.length === 0) continue;

        const entityIds = entitiesOfType.map((e) => e.id);

        // Only update needsUpdate flag and lastActive for entities that need it
        // This approach ensures statistics are recalculated when requested
        const updateConditions = [
            // Always update if kill is recent (within 90 days)
            killDate >= ninetyDaysAgo,
            // Update if it's an old kill but affects recently active entities
            killDate < ninetyDaysAgo,
        ];

        if (updateConditions.some(Boolean)) {
            try {
                await Stats.updateMany(
                    {
                        type: entityType,
                        id: { $in: entityIds },
                    },
                    {
                        $set: { needsUpdate: true, updatedAt: new Date() },
                        $max: { lastActive: killTime },
                    },
                    { upsert: false } // Don't create new documents here
                );
            } catch (error) {
                console.error(
                    `Error updating stats for ${entityType} entities:`,
                    error
                );
            }
        }
    }
}

/**
 * Creates a placeholder stats document for an entity
 * Used when no killmail data exists yet for an entity
 */
export async function createPlaceholderStats(
    type: StatsType,
    id: number
): Promise<IStatsDocument> {
    // Validate entity parameters
    const validation = validateEntity(type, id);
    if (!validation.valid) {
        // Initialize heat map for empty result
        const heatMap: { [key: string]: number } = {};
        for (let i = 0; i < 24; i++) {
            heatMap[`h${i.toString().padStart(2, "0")}`] = 0;
        }

        return {
            type: validation.type,
            id: validation.id,
            days: 0,
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
                mostValuableKills: [],
                mostValuableShips: [],
                mostValuableStructures: [],
                topCharacters: [],
                topCorporations: [],
                topShips: [],
                topSystems: [],
                topConstellations: [],
                topRegions: [],
                heatMapData: [],
                monthlyStats: [],
                shipGroupStats: [],
                basicStats: {
                    kills: 0,
                    losses: 0,
                    iskKilled: 0,
                    iskLost: 0,
                    soloKills: 0,
                    soloLosses: 0,
                    npcLosses: 0,
                    lastActive: null,
                },
            },
            heatMap,
            updatedAt: new Date(),
        };
    }

    // Initialize heat map for empty result
    const heatMap: { [key: string]: number } = {};
    for (let i = 0; i < 24; i++) {
        heatMap[`h${i.toString().padStart(2, "0")}`] = 0;
    }

    return {
        type,
        id,
        days: 0,
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
            mostValuableKills: [],
            mostValuableShips: [],
            mostValuableStructures: [],
            topCharacters: [],
            topCorporations: [],
            topShips: [],
            topSystems: [],
            topConstellations: [],
            topRegions: [],
            heatMapData: [],
            monthlyStats: [],
            shipGroupStats: [],
            basicStats: {
                kills: 0,
                losses: 0,
                iskKilled: 0,
                iskLost: 0,
                soloKills: 0,
                soloLosses: 0,
                npcLosses: 0,
                lastActive: null,
            },
        },
        heatMap,
        updatedAt: new Date(),
    };
}

/**
 * OPTIMIZED: Calculates all stats using single mega-pipeline approach
 * Combines attacker and victim queries into one database call for better performance
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
        // Initialize heat map for empty result
        const heatMap: { [key: string]: number } = {};
        for (let i = 0; i < 24; i++) {
            heatMap[`h${i.toString().padStart(2, "0")}`] = 0;
        }

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
                mostValuableKills: [],
                mostValuableShips: [],
                mostValuableStructures: [],
                topCharacters: [],
                topCorporations: [],
                topShips: [],
                topSystems: [],
                topConstellations: [],
                topRegions: [],
                heatMapData: [],
                monthlyStats: [],
                shipGroupStats: [],
                basicStats: {
                    kills: 0,
                    losses: 0,
                    iskKilled: 0,
                    iskLost: 0,
                    soloKills: 0,
                    soloLosses: 0,
                    npcLosses: 0,
                    lastActive: null,
                },
            },
            heatMap,
            updatedAt: new Date(),
        };
    }

    try {
        // Use the optimized getFacetedStats function for performance
        const facetedStats = await getFacetedStats(
            type,
            id,
            days > 0
                ? { $gte: new Date(Date.now() - days * 24 * 60 * 60 * 1000) }
                : undefined
        );

        // Basic stats extraction
        const kills = facetedStats.basicStats.kills;
        const losses = facetedStats.basicStats.losses;
        const iskKilled = facetedStats.basicStats.iskKilled;
        const iskLost = facetedStats.basicStats.iskLost;
        const soloKills = facetedStats.basicStats.soloKills;
        const soloLosses = facetedStats.basicStats.soloLosses;
        const npcLosses = facetedStats.basicStats.npcLosses;
        const lastActive = facetedStats.basicStats.lastActive;

        // Heat map processing
        const heatMap: { [key: string]: number } = {};
        for (let i = 0; i < 24; i++) {
            heatMap[`h${i.toString().padStart(2, "0")}`] = 0;
        }

        for (const item of facetedStats.heatMapData) {
            const hour = `h${item._id.toString().padStart(2, "0")}`;
            heatMap[hour] = item.count;
        }

        // Process ship group stats
        const shipGroupStatsMap = new Map();

        // Process kills by ship group
        for (const item of facetedStats.shipGroupStats) {
            if (!shipGroupStatsMap.has(item._id)) {
                shipGroupStatsMap.set(item._id, {
                    groupId: item._id,
                    groupName: item.groupName,
                    kills: 0,
                    losses: 0,
                });
            }
            const stats = shipGroupStatsMap.get(item._id);
            stats.kills += item.kills || 0;
            stats.losses += item.losses || 0;
        }

        const shipGroupStats = Array.from(shipGroupStatsMap.values());

        const full = {
            mostUsedShips: facetedStats.mostUsedShips,
            mostLostShips: facetedStats.mostLostShips,
            mostValuableKills: facetedStats.mostValuableKills,
            mostValuableShips: facetedStats.mostValuableShips,
            mostValuableStructures: facetedStats.mostValuableStructures,
            topCharacters: facetedStats.topCharacters,
            topCorporations: facetedStats.topCorporations,
            topShips: facetedStats.topShips,
            topSystems: facetedStats.topSystems,
            topConstellations: facetedStats.topConstellations,
            topRegions: facetedStats.topRegions,
            heatMapData: facetedStats.heatMapData,
            monthlyStats: facetedStats.monthlyStats,
            shipGroupStats,
            basicStats: {
                kills,
                losses,
                iskKilled,
                iskLost,
                soloKills,
                soloLosses,
                npcLosses,
                lastActive,
            },
        };

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
            heatMap,
            updatedAt: new Date(),
        };
    } catch (error) {
        console.error(`Error calculating stats for ${type} ${id}:`, error);
        throw error;
    }
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
 * OPTIMIZED: Execute single mega-faceted aggregation combining attacker and victim stats
 * Replaces 2 separate database calls with 1 unified call
 */
async function getFacetedStats(
    type: StatsType,
    id: number,
    timeFilter?: { $gte: Date }
): Promise<{
    mostUsedShips: Record<number, { count: number; name: any }>;
    mostLostShips: Record<number, { count: number; name: any }>;
    mostValuableKills: any[];
    mostValuableShips: any[];
    mostValuableStructures: any[];
    topCharacters: any[];
    topCorporations: any[];
    topShips: any[];
    topSystems: any[];
    topConstellations: any[];
    topRegions: any[];
    heatMapData: any[];
    monthlyStats: any[];
    shipGroupStats: any[];
    basicStats: {
        kills: number;
        losses: number;
        iskKilled: number;
        iskLost: number;
        soloKills: number;
        soloLosses: number;
        npcLosses: number;
        lastActive: Date | null;
    };
}> {
    // Validate entity parameters
    const validation = validateEntity(type, id);
    if (!validation.valid) {
        return {
            mostUsedShips: {},
            mostLostShips: {},
            mostValuableKills: [],
            mostValuableShips: [],
            mostValuableStructures: [],
            topCharacters: [],
            topCorporations: [],
            topShips: [],
            topSystems: [],
            topConstellations: [],
            topRegions: [],
            heatMapData: [],
            monthlyStats: [],
            shipGroupStats: [],
            basicStats: {
                kills: 0,
                losses: 0,
                iskKilled: 0,
                iskLost: 0,
                soloKills: 0,
                soloLosses: 0,
                npcLosses: 0,
                lastActive: null,
            },
        };
    }

    try {
        // Get ship data from RuntimeCache for better performance
        const validShipIds = Array.from(
            RuntimeCache.invTypesCache.keys()
        ).filter((typeId) => {
            const typeData = RuntimeCache.invTypesCache.get(typeId);
            return (
                typeData && RuntimeCache.invGroupsCache.has(typeData.group_id)
            );
        });
        const validShipGroupIds = Array.from(
            RuntimeCache.invGroupsCache.keys()
        );

        // Build single comprehensive match condition for ALL killmails involving this entity
        const baseMatch: any = {
            $or: [
                { [`victim.${type}`]: id }, // Entity as victim
                { [`attackers.${type}`]: id }, // Entity as attacker
            ],
        };

        if (timeFilter) {
            baseMatch.kill_time = timeFilter;
        }

        // Define constants
        const LIMIT = 10;
        const SHIP_LIMIT = 20;

        // Ship group IDs for valuable ships
        const shipGroupIDs = [
            547, 485, 513, 902, 941, 30, 659, 419, 27, 29, 26, 420, 25, 28, 463,
            237, 31, 324, 898, 906, 540, 830, 893, 543, 541, 833, 358, 894, 831,
            832, 900, 834, 380, 963, 1305,
        ];
        const structureGroupIDs = [1657, 1406, 1404, 1408, 2017, 2016];

        // Create unified faceted pipeline
        const facets: Record<string, any[]> = {
            // Basic stats - combined kills and losses in single facet
            basicStats: [
                {
                    $group: {
                        _id: null,
                        kills: {
                            $sum: {
                                $cond: [
                                    { $in: [id, `$attackers.${type}`] },
                                    1,
                                    0,
                                ],
                            },
                        },
                        losses: {
                            $sum: {
                                $cond: [{ $eq: [`$victim.${type}`, id] }, 1, 0],
                            },
                        },
                        iskKilled: {
                            $sum: {
                                $cond: [
                                    { $in: [id, `$attackers.${type}`] },
                                    "$total_value",
                                    0,
                                ],
                            },
                        },
                        iskLost: {
                            $sum: {
                                $cond: [
                                    { $eq: [`$victim.${type}`, id] },
                                    "$total_value",
                                    0,
                                ],
                            },
                        },
                        soloKills: {
                            $sum: {
                                $cond: [
                                    {
                                        $and: [
                                            { $in: [id, `$attackers.${type}`] },
                                            { $eq: ["$is_solo", true] },
                                        ],
                                    },
                                    1,
                                    0,
                                ],
                            },
                        },
                        soloLosses: {
                            $sum: {
                                $cond: [
                                    {
                                        $and: [
                                            { $eq: [`$victim.${type}`, id] },
                                            { $eq: ["$is_solo", true] },
                                        ],
                                    },
                                    1,
                                    0,
                                ],
                            },
                        },
                        npcLosses: {
                            $sum: {
                                $cond: [
                                    {
                                        $and: [
                                            { $eq: [`$victim.${type}`, id] },
                                            { $eq: ["$is_npc", true] },
                                        ],
                                    },
                                    1,
                                    0,
                                ],
                            },
                        },
                        lastActive: { $max: "$kill_time" },
                    },
                },
            ],

            // Monthly stats - combined kills and losses by month
            monthlyStats: [
                {
                    $group: {
                        _id: {
                            year: { $year: "$kill_time" },
                            month: { $month: "$kill_time" },
                        },
                        kills: {
                            $sum: {
                                $cond: [
                                    { $in: [id, `$attackers.${type}`] },
                                    1,
                                    0,
                                ],
                            },
                        },
                        losses: {
                            $sum: {
                                $cond: [{ $eq: [`$victim.${type}`, id] }, 1, 0],
                            },
                        },
                        iskKilled: {
                            $sum: {
                                $cond: [
                                    { $in: [id, `$attackers.${type}`] },
                                    "$total_value",
                                    0,
                                ],
                            },
                        },
                        iskLost: {
                            $sum: {
                                $cond: [
                                    { $eq: [`$victim.${type}`, id] },
                                    "$total_value",
                                    0,
                                ],
                            },
                        },
                    },
                },
            ],

            // Heat map - combined activity by hour
            heatMapData: [
                {
                    $match: {
                        $or: [
                            { [`victim.${type}`]: id },
                            { [`attackers.${type}`]: id },
                        ],
                    },
                },
                {
                    $group: {
                        _id: { $hour: "$kill_time" },
                        count: { $sum: 1 },
                    },
                },
            ],

            // Ship group stats - combined kills and losses by ship group
            shipGroupKills: [
                { $unwind: "$attackers" },
                {
                    $match: {
                        [`attackers.${type}`]: id,
                        "attackers.ship_group_id": { $in: validShipGroupIds },
                    },
                },
                {
                    $group: {
                        _id: "$attackers.ship_group_id",
                        kills: { $sum: 1 },
                        groupName: { $first: "$attackers.ship_group_name" },
                    },
                },
            ],

            shipGroupLosses: [
                {
                    $match: {
                        [`victim.${type}`]: id,
                        "victim.ship_group_id": { $in: validShipGroupIds },
                    },
                },
                {
                    $group: {
                        _id: "$victim.ship_group_id",
                        losses: { $sum: 1 },
                        groupName: { $first: "$victim.ship_group_name" },
                    },
                },
            ],

            // Most valuable kills
            mostValuableKills: [
                {
                    $match: {
                        [`attackers.${type}`]: id,
                        total_value: { $gt: 0 },
                    },
                },
                { $sort: { total_value: -1 } },
                { $limit: 10 },
            ],

            // Most valuable ships destroyed
            mostValuableShips: [
                {
                    $match: {
                        [`attackers.${type}`]: id,
                        "victim.ship_group_id": { $in: shipGroupIDs },
                        total_value: { $gt: 0 },
                    },
                },
                { $sort: { total_value: -1 } },
                { $limit: 20 },
            ],

            // Most valuable structures destroyed (matching original implementation)
            mostValuableStructures: [
                {
                    $match: {
                        [`attackers.${type}`]: id,
                        "victim.ship_group_id": { $in: structureGroupIDs },
                    },
                },
                {
                    $group: {
                        _id: "$victim.ship_id",
                        type_name: { $first: "$victim.ship_name" },
                        max_value: { $max: "$total_value" },
                        count: { $sum: 1 },
                        system_id: { $first: "$system_id" },
                        system_name: { $first: "$system_name" },
                    },
                },
                { $sort: { max_value: -1 } },
                { $limit: SHIP_LIMIT },
                {
                    $project: {
                        _id: 0,
                        type_id: "$_id",
                        type_name: "$type_name",
                        total_value: "$max_value",
                        count: 1,
                        system_id: 1,
                        system_name: 1,
                    },
                },
            ],

            // Top ships used by entity (matching original implementation)
            topShips: [
                {
                    $project: {
                        entityShips: {
                            $map: {
                                input: {
                                    $filter: {
                                        input: "$attackers",
                                        as: "attacker",
                                        cond: {
                                            $and: [
                                                {
                                                    $eq: [
                                                        `$$attacker.${type}`,
                                                        id,
                                                    ],
                                                },
                                                {
                                                    $ne: [
                                                        "$$attacker.ship_id",
                                                        0,
                                                    ],
                                                },
                                            ],
                                        },
                                    },
                                },
                                as: "attacker",
                                in: {
                                    ship_id: "$$attacker.ship_id",
                                    ship_name: "$$attacker.ship_name",
                                },
                            },
                        },
                    },
                },
                {
                    $match: {
                        "entityShips.0": { $exists: true },
                    },
                },
                { $unwind: "$entityShips" },
                {
                    $group: {
                        _id: "$entityShips.ship_id",
                        count: { $sum: 1 },
                        name: { $first: "$entityShips.ship_name" },
                    },
                },
                { $sort: { count: -1 } },
                { $limit: SHIP_LIMIT },
                {
                    $project: {
                        ship_id: "$_id",
                        id: "$_id",
                        name: 1,
                        count: 1,
                        _id: 0,
                    },
                },
            ],

            topSystems: [
                {
                    $match: {
                        [`attackers.${type}`]: id,
                    },
                },
                {
                    $group: {
                        _id: "$system_id",
                        count: { $sum: 1 },
                        name: { $first: "$system_name" },
                    },
                },
                { $match: { _id: { $ne: 0 } } },
                { $sort: { count: -1 } },
                { $limit: LIMIT },
                {
                    $project: {
                        system_id: "$_id",
                        id: "$_id",
                        name: 1,
                        count: 1,
                        _id: 0,
                    },
                },
            ],
        };

        facets.topConstellations = [
            {
                $group: {
                    _id: "$constellation_id",
                    count: { $sum: 1 },
                    name: { $first: "$constellation_name" },
                },
            },
            { $match: { _id: { $ne: 0 } } },
            { $sort: { count: -1 } },
            { $limit: LIMIT },
            {
                $project: {
                    constellation_id: "$_id",
                    id: "$_id",
                    name: 1,
                    count: 1,
                    _id: 0,
                },
            },
        ];

        facets.topRegions = [
            {
                $group: {
                    _id: "$region_id",
                    count: { $sum: 1 },
                    name: { $first: "$region_name" },
                },
            },
            { $match: { _id: { $ne: 0 } } },
            { $sort: { count: -1 } },
            { $limit: LIMIT },
            {
                $project: {
                    region_id: "$_id",
                    id: "$_id",
                    name: 1,
                    count: 1,
                    _id: 0,
                },
            },
        ];

        // Add victim-specific facets
        facets.mostLostShips = [
            {
                $match: {
                    [`victim.${type}`]: id,
                    "victim.ship_id": { $in: validShipIds },
                },
            },
            {
                $group: {
                    _id: "$victim.ship_id",
                    count: { $sum: 1 },
                    name: { $first: "$victim.ship_name" },
                },
            },
            { $match: { _id: { $ne: 0 } } },
            { $sort: { count: -1 } },
            { $limit: SHIP_LIMIT },
        ];

        // Add attacker-specific facets (when entity is the attacker)
        facets.mostUsedShips = [
            { $unwind: "$attackers" },
            {
                $match: {
                    [`attackers.${type}`]: id,
                    "attackers.ship_id": { $in: validShipIds },
                },
            },
            {
                $group: {
                    _id: "$attackers.ship_id",
                    count: { $sum: 1 },
                    name: { $first: "$attackers.ship_name" },
                },
            },
            { $match: { _id: { $ne: 0 } } },
            { $sort: { count: -1 } },
            { $limit: SHIP_LIMIT },
        ];

        // Add entity-specific facets
        if (type !== "character_id") {
            facets.topCharacters = [
                { $unwind: "$attackers" },
                {
                    $match: {
                        [`attackers.${type}`]: id,
                        "attackers.character_id": { $ne: 0 },
                    },
                },
                {
                    $group: {
                        _id: "$attackers.character_id",
                        count: { $sum: 1 },
                        name: { $first: "$attackers.character_name" },
                    },
                },
                { $match: { _id: { $ne: 0 } } },
                { $sort: { count: -1 } },
                { $limit: LIMIT },
                {
                    $project: {
                        character_id: "$_id",
                        id: "$_id",
                        name: 1,
                        count: 1,
                        _id: 0,
                    },
                },
            ];
        }

        if (type === "alliance_id") {
            facets.topCorporations = [
                { $unwind: "$attackers" },
                {
                    $match: {
                        "attackers.alliance_id": id,
                        "attackers.corporation_id": { $ne: 0 },
                    },
                },
                {
                    $group: {
                        _id: "$attackers.corporation_id",
                        count: { $sum: 1 },
                        name: { $first: "$attackers.corporation_name" },
                    },
                },
                { $match: { _id: { $ne: 0 } } },
                { $sort: { count: -1 } },
                { $limit: LIMIT },
                {
                    $project: {
                        corporation_id: "$_id",
                        id: "$_id",
                        name: 1,
                        count: 1,
                        _id: 0,
                    },
                },
            ];
        }

        // Create the unified pipeline with field projection optimization
        const pipeline = [
            { $match: baseMatch },
            // OPTIMIZATION: Project only essential fields to reduce data processing overhead
            {
                $project: {
                    // Essential fields for entity matching and basic calculations
                    [`attackers.${type}`]: 1,
                    [`victim.${type}`]: 1,
                    total_value: 1,
                    kill_time: 1,
                    is_solo: 1,
                    is_npc: 1,

                    // Essential ship fields
                    "victim.ship_id": 1,
                    "victim.ship_name": 1,
                    "victim.ship_group_id": 1,

                    // Additional fields needed by mostValuableKills facet
                    killmail_id: 1,
                    "victim.character_id": 1,
                    "victim.character_name": 1,
                    "victim.corporation_id": 1,
                    "victim.corporation_name": 1,
                    "victim.alliance_id": 1,
                    "victim.alliance_name": 1,

                    // Attackers array with final_blow field for mostValuableKills
                    "attackers.final_blow": 1,
                    "attackers.character_id": 1,
                    "attackers.character_name": 1,
                    "attackers.ship_id": 1,
                    "attackers.ship_name": 1,

                    // System fields for mostValuableStructures
                    system_id: 1,
                    system_name: 1,

                    // Constellation and region fields for topConstellations/topRegions
                    constellation_id: 1,
                    constellation_name: 1,
                    region_id: 1,
                    region_name: 1,
                },
            },
            { $facet: facets },
        ];

        // Execute single aggregation
        const results = await Killmails.aggregate(pipeline).allowDiskUse(true);
        const data = results[0] || {};

        // Process basic stats
        const basicStatsRaw = data.basicStats?.[0] || {
            kills: 0,
            losses: 0,
            iskKilled: 0,
            iskLost: 0,
            soloKills: 0,
            soloLosses: 0,
            npcLosses: 0,
            lastActive: null,
        };

        // Process ship data into expected format
        const mostUsedShipsMap: Record<number, { count: number; name: any }> =
            {};
        const mostLostShipsMap: Record<number, { count: number; name: any }> =
            {};

        for (const ship of data.mostUsedShips || []) {
            if (ship._id && ship._id !== 0) {
                mostUsedShipsMap[ship._id] = {
                    count: ship.count,
                    name: ship.name,
                };
            }
        }

        for (const ship of data.mostLostShips || []) {
            if (ship._id && ship._id !== 0) {
                mostLostShipsMap[ship._id] = {
                    count: ship.count,
                    name: ship.name,
                };
            }
        }

        // Merge ship group stats from kills and losses
        const shipGroupStatsMap = new Map();

        for (const item of data.shipGroupKills || []) {
            shipGroupStatsMap.set(item._id, {
                _id: item._id,
                groupName: item.groupName,
                kills: item.kills || 0,
                losses: 0,
            });
        }

        for (const item of data.shipGroupLosses || []) {
            if (shipGroupStatsMap.has(item._id)) {
                shipGroupStatsMap.get(item._id).losses = item.losses || 0;
            } else {
                shipGroupStatsMap.set(item._id, {
                    _id: item._id,
                    groupName: item.groupName,
                    kills: 0,
                    losses: item.losses || 0,
                });
            }
        }

        const shipGroupStats = Array.from(shipGroupStatsMap.values());

        return {
            mostUsedShips: mostUsedShipsMap,
            mostLostShips: mostLostShipsMap,
            mostValuableKills: data.mostValuableKills || [],
            mostValuableShips: data.mostValuableShips || [],
            mostValuableStructures: data.mostValuableStructures || [],
            topCharacters: data.topCharacters || [],
            topCorporations: data.topCorporations || [],
            topShips: data.topShips || [],
            topSystems: data.topSystems || [],
            topConstellations: data.topConstellations || [],
            topRegions: data.topRegions || [],
            heatMapData: data.heatMapData || [],
            monthlyStats: data.monthlyStats || [],
            shipGroupStats,
            basicStats: {
                kills: basicStatsRaw.kills,
                losses: basicStatsRaw.losses,
                iskKilled: basicStatsRaw.iskKilled,
                iskLost: basicStatsRaw.iskLost,
                soloKills: basicStatsRaw.soloKills,
                soloLosses: basicStatsRaw.soloLosses,
                npcLosses: basicStatsRaw.npcLosses,
                lastActive: basicStatsRaw.lastActive,
            },
        };
    } catch (error) {
        console.error(`Error in getFacetedStats for ${type} ${id}:`, error);
        return {
            mostUsedShips: {},
            mostLostShips: {},
            mostValuableKills: [],
            mostValuableShips: [],
            mostValuableStructures: [],
            topCharacters: [],
            topCorporations: [],
            topShips: [],
            topSystems: [],
            topConstellations: [],
            topRegions: [],
            heatMapData: [],
            monthlyStats: [],
            shipGroupStats: [],
            basicStats: {
                kills: 0,
                losses: 0,
                iskKilled: 0,
                iskLost: 0,
                soloKills: 0,
                soloLosses: 0,
                npcLosses: 0,
                lastActive: null,
            },
        };
    }
}

async function getBlobFactorData(
    type: StatsType,
    id: number,
    timeFilter?: { $gte: Date }
): Promise<{ blobScore: number; blobFactor: string }> {
    try {
        // Validate entity parameters
        const validation = validateEntity(type, id);
        if (!validation.valid) {
            return { blobScore: 0, blobFactor: "Unknown" };
        }

        // Base match condition for being on killmails as attacker
        const baseMatch: any = {
            [`attackers.${type}`]: id,
        };

        if (timeFilter) {
            baseMatch.kill_time = timeFilter;
        }

        // Calculate blob factor based on average fleet size participation
        const blobPipeline = [
            { $match: baseMatch },
            { $unwind: "$attackers" },
            {
                $match: {
                    [`attackers.${type}`]: id,
                },
            },
            {
                $group: {
                    _id: "$killmail_id",
                    fleetSize: { $first: "$attackers_count" },
                    totalDamage: { $first: "$total_value" },
                },
            },
            {
                $group: {
                    _id: null,
                    avgFleetSize: { $avg: "$fleetSize" },
                    totalKills: { $sum: 1 },
                    totalDamage: { $sum: "$totalDamage" },
                },
            },
        ];

        const blobResults = await Killmails.aggregate(
            blobPipeline
        ).allowDiskUse(true);
        const blobData = blobResults[0] || { avgFleetSize: 0, totalKills: 0 };

        const avgFleetSize = blobData.avgFleetSize || 0;

        // Calculate blob score and factor
        let blobFactor = "Solo";
        let blobScore = 0;

        if (avgFleetSize > 100) {
            blobFactor = "Mega Blob";
            blobScore = 5;
        } else if (avgFleetSize > 50) {
            blobFactor = "Large Blob";
            blobScore = 4;
        } else if (avgFleetSize > 20) {
            blobFactor = "Medium Blob";
            blobScore = 3;
        } else if (avgFleetSize > 10) {
            blobFactor = "Small Gang";
            blobScore = 2;
        } else if (avgFleetSize > 2) {
            blobFactor = "Micro Gang";
            blobScore = 1;
        }

        return {
            blobScore: Math.round(blobScore),
            blobFactor,
        };
    } catch (error) {
        console.error(
            `Error calculating blob factor for ${type} ${id}:`,
            error
        );
        return { blobScore: 0, blobFactor: "Unknown" };
    }
}
