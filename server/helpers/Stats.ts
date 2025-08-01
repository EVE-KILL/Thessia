import { LRUCache } from "lru-cache";

// LRU cache for ship groups data (category_id: 6, published: true)
const shipGroupsCache = new LRUCache<string, Set<number>>({
    max: 100,
    ttl: 1000 * 60 * 60 * 24, // 24 hours TTL
    allowStale: true,
});

// LRU cache for ship types data (category_id: 6)
const shipTypesCache = new LRUCache<string, number[]>({
    max: 100,
    ttl: 1000 * 60 * 60 * 24, // 24 hours TTL
    allowStale: true,
});

/**
 * Get valid ship group IDs from cache or database
 * Uses LRU caching since this data rarely changes
 */
async function getCachedValidShipGroupIds(): Promise<Set<number>> {
    const cacheKey = "ship_groups_category_6_published";

    // Try to get from cache first
    const cached = shipGroupsCache.get(cacheKey);
    if (cached) {
        return cached;
    }

    // Fetch from database
    const shipGroups = await InvGroups.find(
        { category_id: 6, published: true },
        { group_id: 1 }
    ).lean();

    const result = new Set(shipGroups.map((group: any) => group.group_id));

    // Cache the result
    shipGroupsCache.set(cacheKey, result);

    return result;
}

/**
 * Get valid ship type IDs from cache or database
 * Uses LRU caching since this data rarely changes
 */
async function getCachedValidShipTypeIds(): Promise<number[]> {
    const cacheKey = "ship_types_category_6";

    // Try to get from cache first
    const cached = shipTypesCache.get(cacheKey);
    if (cached) {
        return cached;
    }

    // Fetch from database
    const shipTypes = await InvTypes.find(
        { category_id: 6 },
        { type_id: 1 }
    ).lean();

    const result = shipTypes.map((item: any) => item.type_id);

    // Cache the result
    shipTypesCache.set(cacheKey, result);

    return result;
}

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
 * Create placeholder basic stats for API when no cached stats exist
 * This is a lightweight version used only for immediate API responses
 */
export async function createPlaceholderStats(
    type: StatsType,
    id: number,
    days: number
): Promise<Partial<IStatsDocument>> {
    const validation = validateEntity(type, id);
    if (!validation.valid) {
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
            updatedAt: new Date(),
        };
    }

    // For placeholder, just return basic structure with zero values
    // Real stats will be calculated by queue and stored in database
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
        updatedAt: new Date(),
    };
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
                mostValuableKills: [],
                mostValuableShips: [],
                mostValuableStructures: [],
                topCharacters: [],
                topCorporations: [],
                topShips: [],
                topSystems: [],
                topConstellations: [],
                topRegions: [],
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
        mostValuableKills: [],
        mostValuableShips: [],
        mostValuableStructures: [],
        topCharacters: [],
        topCorporations: [],
        topShips: [],
        topSystems: [],
        topConstellations: [],
        topRegions: [],
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

    // Run comprehensive faceted stats calculation that includes basic stats
    const [
        facetedStats, // Single faceted call replaces 14+ individual queries including basic stats
        characterSpecificStats,
        blobFactorData,
    ] = await Promise.all([
        getFacetedStats(type, id, timeFilter), // Now includes basic stats + all other stats
        type === "character_id"
            ? getCharacterSpecificStats(id, timeFilter, 0) // Will update with actual kills after faceted results
            : Promise.resolve({ possibleFC: false, possibleCynoAlt: false }),
        type === "character_id"
            ? getBlobFactorData(type, id, timeFilter)
            : Promise.resolve({ blobCount: 0 }),
    ]);

    // Extract basic stats from faceted results
    const kills = facetedStats.basicStats?.kills || 0;
    const losses = facetedStats.basicStats?.losses || 0;
    const iskKilled = facetedStats.basicStats?.iskKilled || 0;
    const iskLost = facetedStats.basicStats?.iskLost || 0;
    const soloKills = facetedStats.basicStats?.soloKills || 0;
    const soloLosses = facetedStats.basicStats?.soloLosses || 0;
    const npcLosses = facetedStats.basicStats?.npcLosses || 0;
    const lastActive = facetedStats.basicStats?.lastActive;

    // Update character-specific stats with actual kill count if needed
    const finalCharacterStats =
        type === "character_id" && kills < 25
            ? await getCharacterSpecificStats(id, timeFilter, kills)
            : characterSpecificStats;

    // Process ship stats
    if (facetedStats.shipGroupStats && facetedStats.shipGroupStats.length > 0) {
        full.shipGroupStats = facetedStats.shipGroupStats;
    }

    // Process most used ships
    if (
        facetedStats.mostUsedShips &&
        Object.keys(facetedStats.mostUsedShips).length > 0
    ) {
        full.mostUsedShips = facetedStats.mostUsedShips;
    }

    // Process most lost ships
    if (
        facetedStats.mostLostShips &&
        Object.keys(facetedStats.mostLostShips).length > 0
    ) {
        full.mostLostShips = facetedStats.mostLostShips;
    }

    // Process most valuable kills
    if (
        facetedStats.mostValuableKills &&
        facetedStats.mostValuableKills.length > 0
    ) {
        full.mostValuableKills = facetedStats.mostValuableKills;
    }

    // Process most valuable ships
    if (
        facetedStats.mostValuableShips &&
        facetedStats.mostValuableShips.length > 0
    ) {
        full.mostValuableShips = facetedStats.mostValuableShips;
    }

    // Process most valuable structures
    if (
        facetedStats.mostValuableStructures &&
        facetedStats.mostValuableStructures.length > 0
    ) {
        full.mostValuableStructures = facetedStats.mostValuableStructures;
    }

    // Process top characters (not applicable for character stats)
    if (
        type !== "character_id" &&
        facetedStats.topCharacters &&
        facetedStats.topCharacters.length > 0
    ) {
        full.topCharacters = facetedStats.topCharacters;
    }

    // Process top corporations (only applicable for alliance stats)
    if (
        type === "alliance_id" &&
        facetedStats.topCorporations &&
        facetedStats.topCorporations.length > 0
    ) {
        full.topCorporations = facetedStats.topCorporations;
    }

    // Process top ships
    if (facetedStats.topShips && facetedStats.topShips.length > 0) {
        full.topShips = facetedStats.topShips;
    }

    // Process top systems
    if (facetedStats.topSystems && facetedStats.topSystems.length > 0) {
        full.topSystems = facetedStats.topSystems;
    }

    // Process top constellations
    if (
        facetedStats.topConstellations &&
        facetedStats.topConstellations.length > 0
    ) {
        full.topConstellations = facetedStats.topConstellations;
    }

    // Process top regions
    if (facetedStats.topRegions && facetedStats.topRegions.length > 0) {
        full.topRegions = facetedStats.topRegions;
    }

    // Process monthly stats
    if (facetedStats.monthlyStats && facetedStats.monthlyStats.length > 0) {
        full.monthlyStats = facetedStats.monthlyStats;
    }

    // Process heat map
    if (facetedStats.heatMapData && facetedStats.heatMapData.length > 0) {
        facetedStats.heatMapData.forEach((hourData: any) => {
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
        full.possibleFC = finalCharacterStats.possibleFC;
        full.possibleCynoAlt = finalCharacterStats.possibleCynoAlt;
    }

    // Clean up unnecessary fields based on entity type
    if (type !== "character_id") {
        // For corporations and alliances, remove character-specific stats
        full.possibleFC = false;
        full.possibleCynoAlt = false;
        full.blobFactor = 0;
        full.sameShipAsOtherAttackers = 0;
        full.fliesWithCorporations = {};
        full.fliesWithAlliances = {};
        full.diesToCorporations = {};
        full.diesToAlliances = {};
    }

    // For characters, remove top characters (as they don't make sense)
    if (type === "character_id") {
        full.topCharacters = [];
        full.topCorporations = [];
    }

    // For corporations, remove top corporations (only alliances have those)
    if (type === "corporation_id") {
        full.topCorporations = [];
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
 * Build faceted aggregation pipeline for attacker-based stats
 * Combines multiple "top X" queries into a single database call
 */
async function buildAttackerFacetedPipeline(
    type: StatsType,
    id: number,
    timeFilter?: { $gte: Date }
): Promise<any[]> {
    // Get cached ship type IDs for filtering
    const validShipIds = await getCachedValidShipTypeIds();

    // Get cached ship group IDs for filtering
    const validShipGroupIds = await getCachedValidShipGroupIds();
    const validShipGroupIdsArray = Array.from(validShipGroupIds);

    // Build base match condition for attacks
    const baseMatch: any = { [`attackers.${type}`]: id };
    if (timeFilter) {
        baseMatch.kill_time = timeFilter;
    }

    // Define limits for each facet
    const SHIP_LIMIT = 20;
    const KILL_LIMIT = 10;
    const CHARACTER_LIMIT = 10;
    const CORPORATION_LIMIT = 10;
    const SYSTEM_LIMIT = 10;
    const CONSTELLATION_LIMIT = 10;
    const REGION_LIMIT = 10;

    // Ship group IDs for valuable ships (from TopLists.ts)
    const shipGroupIDs = [
        547, 485, 513, 902, 941, 30, 659, 419, 27, 29, 26, 420, 25, 28, 463,
        237, 31, 324, 898, 906, 540, 830, 893, 543, 541, 833, 358, 894, 831,
        832, 900, 834, 380, 963, 1305,
    ];

    // Structure group IDs for valuable structures (from TopLists.ts)
    const structureGroupIDs = [1657, 1406, 1404, 1408, 2017, 2016];

    const facets: Record<string, any[]> = {
        // Most Used Ships - attacks by entity, group by ship
        mostUsedShips: [
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
        ],

        // Most Valuable Kills - attacks by entity, sort by value
        mostValuableKills: [
            {
                $project: {
                    killmail_id: 1,
                    total_value: 1,
                    "victim.ship_id": 1,
                    "victim.ship_name": 1,
                    "victim.character_id": 1,
                    "victim.character_name": 1,
                    "victim.corporation_id": 1,
                    "victim.corporation_name": 1,
                    "victim.alliance_id": 1,
                    "victim.alliance_name": 1,
                    attackers: {
                        $filter: {
                            input: "$attackers",
                            as: "attacker",
                            cond: { $eq: ["$$attacker.final_blow", true] },
                        },
                    },
                },
            },
            {
                $addFields: {
                    final_blow: { $arrayElemAt: ["$attackers", 0] },
                },
            },
            {
                $project: {
                    killmail_id: 1,
                    total_value: 1,
                    victim: 1,
                    "final_blow.character_id": 1,
                    "final_blow.character_name": 1,
                    "final_blow.ship_id": 1,
                    "final_blow.ship_name": 1,
                },
            },
            { $sort: { total_value: -1 } },
            { $limit: KILL_LIMIT },
        ],

        // Most Valuable Ships - attacks by entity, group by ship, max value
        mostValuableShips: [
            {
                $match: {
                    "victim.ship_group_id": { $in: shipGroupIDs },
                },
            },
            {
                $group: {
                    _id: "$victim.ship_id",
                    ship_name: { $first: "$victim.ship_name" },
                    max_value: { $max: "$total_value" },
                    count: { $sum: 1 },
                },
            },
            { $sort: { max_value: -1 } },
            { $limit: SHIP_LIMIT },
            {
                $project: {
                    _id: 0,
                    ship_id: "$_id",
                    ship_name: "$ship_name",
                    total_value: "$max_value",
                    count: 1,
                },
            },
        ],

        // Most Valuable Structures - attacks by entity, structures only
        mostValuableStructures: [
            {
                $match: {
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
    };

    // Add character-specific facets (only for corporation and alliance)
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
            { $limit: CHARACTER_LIMIT },
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

    // Add corporation-specific facets (only for alliance)
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
            { $limit: CORPORATION_LIMIT },
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

    // Add universal facets (for all entity types)
    facets.topShips = [
        { $unwind: "$attackers" },
        {
            $match: {
                [`attackers.${type}`]: id,
                "attackers.ship_id": { $ne: 0 },
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
        {
            $project: {
                ship_id: "$_id",
                id: "$_id",
                name: 1,
                count: 1,
                _id: 0,
            },
        },
    ];

    facets.topSystems = [
        {
            $group: {
                _id: "$system_id",
                count: { $sum: 1 },
                name: { $first: "$system_name" },
            },
        },
        { $match: { _id: { $ne: 0 } } },
        { $sort: { count: -1 } },
        { $limit: SYSTEM_LIMIT },
        {
            $project: {
                system_id: "$_id",
                id: "$_id",
                name: 1,
                count: 1,
                _id: 0,
            },
        },
    ];

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
        { $limit: CONSTELLATION_LIMIT },
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
        { $limit: REGION_LIMIT },
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

    // Heat Map - kills by hour (attacker perspective)
    facets.heatMapData = [
        {
            $group: {
                _id: { $hour: "$kill_time" },
                count: { $sum: 1 },
            },
        },
    ];

    // Monthly Stats - kills by month (attacker perspective)
    facets.monthlyKills = [
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

    // Ship Group Stats - kills by ship group (attacker perspective)
    facets.shipGroupKills = [
        { $unwind: "$attackers" },
        {
            $match: {
                [`attackers.${type}`]: id,
                "attackers.ship_group_id": { $in: validShipGroupIdsArray },
            },
        },
        {
            $group: {
                _id: "$attackers.ship_group_id",
                kills: { $sum: 1 },
                groupName: { $first: "$attackers.ship_group_name" },
            },
        },
    ];

    // Basic stats - kills by this entity (attacker perspective)
    facets.basicKillStats = [
        { $unwind: "$attackers" },
        {
            $match: {
                [`attackers.${type}`]: id,
            },
        },
        {
            $group: {
                _id: null,
                kills: { $sum: 1 },
                iskKilled: { $sum: "$total_value" },
                soloKills: {
                    $sum: {
                        $cond: [{ $eq: ["$is_solo", true] }, 1, 0],
                    },
                },
                lastActive: { $max: "$kill_time" },
            },
        },
    ];

    return [{ $match: baseMatch }, { $facet: facets }];
}

/**
 * Build faceted aggregation pipeline for victim-based stats
 * Handles queries where the entity is the victim
 */
async function buildVictimFacetedPipeline(
    type: StatsType,
    id: number,
    timeFilter?: { $gte: Date }
): Promise<any[]> {
    // Get cached ship type IDs for filtering
    const validShipIds = await getCachedValidShipTypeIds();

    // Get cached ship group IDs for filtering
    const validShipGroupIds = await getCachedValidShipGroupIds();
    const validShipGroupIdsArray = Array.from(validShipGroupIds);

    // Build base match condition for losses
    const baseMatch: any = { [`victim.${type}`]: id };
    if (timeFilter) {
        baseMatch.kill_time = timeFilter;
    }

    const SHIP_LIMIT = 20;

    const facets: Record<string, any[]> = {
        // Most Lost Ships - losses by entity, group by ship
        mostLostShips: [
            {
                $match: {
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
        ],

        // Monthly Stats - losses by month (victim perspective)
        monthlyLosses: [
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
        ],

        // Ship Group Stats - losses by ship group (victim perspective)
        shipGroupLosses: [
            {
                $match: {
                    "victim.ship_group_id": { $in: validShipGroupIdsArray },
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

        // Basic stats - losses by this entity (victim perspective)
        basicLossStats: [
            {
                $group: {
                    _id: null,
                    losses: { $sum: 1 },
                    iskLost: { $sum: "$total_value" },
                    soloLosses: {
                        $sum: {
                            $cond: [{ $eq: ["$is_solo", true] }, 1, 0],
                        },
                    },
                    npcLosses: {
                        $sum: {
                            $cond: [{ $eq: ["$is_npc", true] }, 1, 0],
                        },
                    },
                    lastActive: { $max: "$kill_time" },
                },
            },
        ],
    };

    return [{ $match: baseMatch }, { $facet: facets }];
}

/**
 * Execute faceted aggregations and return combined results
 * Replaces 11 individual database queries with 2 faceted queries
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
        // Execute both faceted pipelines in parallel
        const [attackerPipeline, victimPipeline] = await Promise.all([
            buildAttackerFacetedPipeline(
                validation.type,
                validation.id,
                timeFilter
            ),
            buildVictimFacetedPipeline(
                validation.type,
                validation.id,
                timeFilter
            ),
        ]);

        const [attackerResults, victimResults] = await Promise.all([
            Killmails.aggregate(attackerPipeline).allowDiskUse(true),
            Killmails.aggregate(victimPipeline).allowDiskUse(true),
        ]);

        // Extract results from faceted aggregations
        const attackerData = attackerResults[0] || {};
        const victimData = victimResults[0] || {};

        // Process basic stats from both attacker and victim facets
        const killStats = attackerData.basicKillStats?.[0] || {
            kills: 0,
            iskKilled: 0,
            soloKills: 0,
            lastActive: null,
        };
        const lossStats = victimData.basicLossStats?.[0] || {
            losses: 0,
            iskLost: 0,
            soloLosses: 0,
            npcLosses: 0,
            lastActive: null,
        };

        // Combine basic stats
        const basicStats = {
            kills: killStats.kills,
            losses: lossStats.losses,
            iskKilled: killStats.iskKilled,
            iskLost: lossStats.iskLost,
            soloKills: killStats.soloKills,
            soloLosses: lossStats.soloLosses,
            npcLosses: lossStats.npcLosses,
            lastActive:
                killStats.lastActive && lossStats.lastActive
                    ? new Date(
                          Math.max(
                              killStats.lastActive.getTime(),
                              lossStats.lastActive.getTime()
                          )
                      )
                    : killStats.lastActive || lossStats.lastActive,
        };

        // Process most used ships (from attacker facet)
        const mostUsedShips: Record<number, { count: number; name: any }> = {};
        if (attackerData.mostUsedShips) {
            attackerData.mostUsedShips.forEach((ship: any) => {
                if (ship._id) {
                    mostUsedShips[ship._id] = {
                        count: ship.count,
                        name: ship.name || { en: "" },
                    };
                }
            });
        }

        // Process most lost ships (from victim facet)
        const mostLostShips: Record<number, { count: number; name: any }> = {};
        if (victimData.mostLostShips) {
            victimData.mostLostShips.forEach((ship: any) => {
                if (ship._id) {
                    mostLostShips[ship._id] = {
                        count: ship.count,
                        name: ship.name || { en: "" },
                    };
                }
            });
        }

        // Process monthly stats by combining kills and losses from both facets
        const monthlyStatsMap = new Map<string, any>();
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

        // Process kills data from attacker facet
        if (attackerData.monthlyKills) {
            attackerData.monthlyKills.forEach((result: any) => {
                if (!result._id) return;
                const year = result._id.year;
                const month = result._id.month;
                const key = `${year}-${month}`;

                if (!monthlyStatsMap.has(key)) {
                    monthlyStatsMap.set(key, {
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

                const monthStat = monthlyStatsMap.get(key)!;
                monthStat.kills = result.kills || 0;
                monthStat.iskKilled = result.iskKilled || 0;
            });
        }

        // Process losses data from victim facet
        if (victimData.monthlyLosses) {
            victimData.monthlyLosses.forEach((result: any) => {
                if (!result._id) return;
                const year = result._id.year;
                const month = result._id.month;
                const key = `${year}-${month}`;

                if (!monthlyStatsMap.has(key)) {
                    monthlyStatsMap.set(key, {
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

                const monthStat = monthlyStatsMap.get(key)!;
                monthStat.losses = result.losses || 0;
                monthStat.iskLost = result.iskLost || 0;
            });
        }

        // Calculate efficiency and convert to array
        const monthlyStats = Array.from(monthlyStatsMap.values()).map(
            (stat) => {
                const totalKills = stat.kills + stat.losses;
                stat.efficiency =
                    totalKills > 0
                        ? Math.round((stat.kills / totalKills) * 100)
                        : 0;
                return stat;
            }
        );

        // Sort by year and month (newest first)
        monthlyStats.sort((a, b) => {
            if (a.year !== b.year) return b.year - a.year;
            return b.month - a.month;
        });

        // Process ship group stats by combining kills and losses from both facets
        const shipGroupStatsMap = new Map<
            number,
            {
                groupName: string;
                kills: number;
                losses: number;
                efficiency: number;
            }
        >();

        // Process kills from attacker facet
        if (attackerData.shipGroupKills) {
            attackerData.shipGroupKills.forEach((result: any) => {
                const shipGroupId = result._id;
                const groupName =
                    result.groupName?.en ||
                    result.groupName ||
                    "Unknown Ship Group";

                if (shipGroupId) {
                    shipGroupStatsMap.set(shipGroupId, {
                        groupName,
                        kills: result.kills,
                        losses: 0,
                        efficiency: 0,
                    });
                }
            });
        }

        // Process losses from victim facet
        if (victimData.shipGroupLosses) {
            victimData.shipGroupLosses.forEach((result: any) => {
                const shipGroupId = result._id;
                const groupName =
                    result.groupName?.en ||
                    result.groupName ||
                    "Unknown Ship Group";

                if (shipGroupId) {
                    const existing = shipGroupStatsMap.get(shipGroupId);
                    if (existing) {
                        existing.losses = result.losses;
                    } else {
                        shipGroupStatsMap.set(shipGroupId, {
                            groupName,
                            kills: 0,
                            losses: result.losses,
                            efficiency: 0,
                        });
                    }
                }
            });
        }

        // Calculate efficiency and convert to array
        const shipGroupStats = Array.from(shipGroupStatsMap.values()).map(
            (stat) => {
                const total = stat.kills + stat.losses;
                stat.efficiency =
                    total > 0 ? Math.round((stat.kills / total) * 100) : 0;
                return stat;
            }
        );

        // Sort by total activity (kills + losses) descending
        shipGroupStats.sort(
            (a, b) => b.kills + b.losses - (a.kills + a.losses)
        );

        return {
            mostUsedShips,
            mostLostShips,
            mostValuableKills: attackerData.mostValuableKills || [],
            mostValuableShips: attackerData.mostValuableShips || [],
            mostValuableStructures: attackerData.mostValuableStructures || [],
            topCharacters: attackerData.topCharacters || [],
            topCorporations: attackerData.topCorporations || [],
            topShips: attackerData.topShips || [],
            topSystems: attackerData.topSystems || [],
            topConstellations: attackerData.topConstellations || [],
            topRegions: attackerData.topRegions || [],
            heatMapData: attackerData.heatMapData || [],
            monthlyStats,
            shipGroupStats,
            basicStats,
        };
    } catch (error) {
        console.error(
            `Error executing faceted aggregation for ${type} ${id}:`,
            error
        );
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

    const pipeline = [
        { $match: matchCondition },
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
        },
    ];

    const result = await Killmails.aggregate(pipeline).allowDiskUse(true);

    return result[0] || { blobCount: 0 };
}
