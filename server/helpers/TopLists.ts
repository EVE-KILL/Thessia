import { Alliances } from "~/server/models/Alliances";
import { Characters } from "~/server/models/Characters";
import { Constellations } from "~/server/models/Constellations";
import { Corporations } from "~/server/models/Corporations";
import { InvTypes } from "~/server/models/InvTypes";
import { Killmails } from "~/server/models/Killmails";
import { Regions } from "~/server/models/Regions";
import { SolarSystems } from "~/server/models/SolarSystems";

// Earliest known killmail is from 2007-12-05
const timeSinceEarlyDays: Date = new Date("2007-12-05T00:00:00Z");

/**
 * Returns a list of top characters by kill count
 * @param attackerType - Optional filter for attacker type (e.g., 'ship_id')
 * @param typeId - Optional ID to filter by when attackerType is provided
 * @param days - Number of days to look back, defaults to 30
 * @param limit - Maximum number of results to return, defaults to 10
 */
async function topCharacters(
    attackerType: string | null = null,
    typeId: number | null = null,
    days: number | null = 30,
    limit = 10,
) {
    let calculatedTime = timeSinceEarlyDays;
    if (days) {
        calculatedTime = new Date(Date.now() - days * 86400 * 1000);
    }

    const matchFilter: any = {
        "attackers.character_id": { $ne: 0 },
        kill_time: { $gte: calculatedTime },
    };

    const query: any[] = [];

    // Stage 1: Initial match
    if (attackerType && typeId) {
        // Find killmails with our entity
        matchFilter[`attackers.${attackerType}`] = typeId;
    }
    query.push({ $match: matchFilter });

    // Stage 2: Project relevant data
    query.push({
        $project: {
            "attackers": 1,
            killmail_id: 1
        }
    });

    // Stage 3: Unwind attackers
    query.push({ $unwind: "$attackers" });

    // Stage 4: Filter to only include relevant attackers
    const secondMatchStage: any = {
        "attackers.character_id": { $ne: 0 }
    };

    // Key improvement: when filtering by entity, only count characters related to that entity
    if (attackerType && typeId) {
        secondMatchStage[`attackers.${attackerType}`] = typeId;
    }
    query.push({ $match: secondMatchStage });

    // Rest of pipeline (grouping, sorting, etc.)
    query.push({
        $group: {
            _id: "$attackers.character_id",
            count: { $sum: 1 },
        },
    });
    query.push({ $sort: { count: -1, id: 1 } });
    query.push({ $limit: limit });
    query.push({
        $project: {
            id: "$_id",
            count: 1,
            _id: 0,
        },
    });

    const results = await Killmails.aggregate(query, {
        allowDiskUse: true,
    });

    // Batch load character data instead of individual queries
    const characterIds = results.map((result) => result.id);
    const characters = await Characters.find(
        { character_id: { $in: characterIds } },
        { character_id: 1, name: 1, _id: 0 },
    ).lean();

    // Create a map for faster lookups
    const characterMap = new Map();
    characters.forEach((char) => {
        characterMap.set(char.character_id, char.name);
    });

    // Map results with character names
    return results.map((character) => ({
        character_id: character.id,
        name: characterMap.get(character.id) || "Unknown",
        count: character.count,
    }));
}

/**
 * Returns a list of top corporations by kill count
 * @param attackerType - Optional filter for attacker type (e.g., 'ship_id')
 * @param typeId - Optional ID to filter by when attackerType is provided
 * @param days - Number of days to look back, defaults to 30
 * @param limit - Maximum number of results to return, defaults to 10
 */
async function topCorporations(
    attackerType: string | null = null,
    typeId: number | null = null,
    days: number | null = 30,
    limit = 10,
) {
    let calculatedTime = timeSinceEarlyDays;
    if (days) {
        calculatedTime = new Date(Date.now() - days * 86400 * 1000);
    }

    const matchFilter: any = {
        "attackers.corporation_id": { $ne: 0 },
        kill_time: { $gte: calculatedTime },
    };

    const query: any[] = [];

    // Stage 1: Initial match
    if (attackerType && typeId) {
        matchFilter[`attackers.${attackerType}`] = typeId;
    }
    query.push({ $match: matchFilter });

    // Stage 2: Project relevant data
    query.push({
        $project: {
            "attackers": 1,
            killmail_id: 1
        }
    });

    // Stage 3: Unwind attackers
    query.push({ $unwind: "$attackers" });

    // Stage 4: Filter to only include relevant attackers
    const secondMatchStage: any = {
        "attackers.corporation_id": { $ne: 0 }
    };

    // Key improvement: when filtering by entity, only count corporations related to that entity
    if (attackerType && typeId) {
        secondMatchStage[`attackers.${attackerType}`] = typeId;
    }
    query.push({ $match: secondMatchStage });

    // Rest of pipeline (grouping, sorting, etc.)
    query.push({
        $group: {
            _id: "$attackers.corporation_id",
            count: { $sum: 1 },
        },
    });
    query.push({ $sort: { count: -1, _id: 1 } });
    query.push({ $limit: limit });
    query.push({
        $project: {
            id: "$_id",
            count: 1,
            _id: 0,
        },
    });

    const results = await Killmails.aggregate(query, {
        allowDiskUse: true,
    });

    // Batch load corporation data instead of individual queries
    const corporationIds = results.map((result) => result.id);
    const corporations = await Corporations.find(
        { corporation_id: { $in: corporationIds } },
        { corporation_id: 1, name: 1, _id: 0 },
    ).lean();

    // Create a map for faster lookups
    const corporationMap = new Map();
    corporations.forEach((corp) => {
        corporationMap.set(corp.corporation_id, corp.name);
    });

    // Map results with corporation names
    return results.map((corporation) => ({
        corporation_id: corporation.id,
        name: corporationMap.get(corporation.id) || "Unknown",
        count: corporation.count,
    }));
}

/**
 * Returns a list of top alliances by kill count
 * @param attackerType - Optional filter for attacker type (e.g., 'ship_id')
 * @param typeId - Optional ID to filter by when attackerType is provided
 * @param days - Number of days to look back, defaults to 30
 * @param limit - Maximum number of results to return, defaults to 10
 */
async function topAlliances(
    attackerType: string | null = null,
    typeId: number | null = null,
    days: number | null = 30,
    limit = 10,
) {
    let calculatedTime = timeSinceEarlyDays;
    if (days) {
        calculatedTime = new Date(Date.now() - days * 86400 * 1000);
    }

    const matchFilter: any = {
        "attackers.alliance_id": { $ne: 0 },
        kill_time: { $gte: calculatedTime },
    };

    const query: any[] = [];

    // Stage 1: Initial match
    if (attackerType && typeId) {
        matchFilter[`attackers.${attackerType}`] = typeId;
    }
    query.push({ $match: matchFilter });

    // Stage 2: Project relevant data
    query.push({
        $project: {
            "attackers": 1,
            killmail_id: 1
        }
    });

    // Stage 3: Unwind attackers
    query.push({ $unwind: "$attackers" });

    // Stage 4: Filter to only include relevant attackers
    const secondMatchStage: any = {
        "attackers.alliance_id": { $ne: 0 }
    };

    // Key improvement: when filtering by entity, only count alliances related to that entity
    if (attackerType && typeId) {
        secondMatchStage[`attackers.${attackerType}`] = typeId;
    }
    query.push({ $match: secondMatchStage });

    // Rest of pipeline (grouping, sorting, etc.)
    query.push({
        $group: {
            _id: "$attackers.alliance_id",
            count: { $sum: 1 },
        },
    });
    query.push({ $sort: { count: -1, _id: 1 } });
    query.push({ $limit: limit });
    query.push({
        $project: {
            id: "$_id",
            count: 1,
            _id: 0,
        },
    });

    const results = await Killmails.aggregate(query, {
        allowDiskUse: true,
    });

    // Batch load alliance data
    const allianceIds = results.map((result) => result.id);
    const alliances = await Alliances.find(
        { alliance_id: { $in: allianceIds } },
        { alliance_id: 1, name: 1, _id: 0 },
    ).lean();

    // Create a map for faster lookups
    const allianceMap = new Map();
    alliances.forEach((alliance) => {
        allianceMap.set(alliance.alliance_id, alliance.name);
    });

    // Map results with alliance names
    return results.map((alliance) => ({
        alliance_id: alliance.id,
        name: allianceMap.get(alliance.id) || "Unknown",
        count: alliance.count,
    }));
}

/**
 * Returns a list of top solo killers
 * @param attackerType - Optional filter for attacker type (e.g., 'ship_id')
 * @param typeId - Optional ID to filter by when attackerType is provided
 * @param days - Number of days to look back, defaults to 30
 * @param limit - Maximum number of results to return, defaults to 10
 */
async function topSolo(
    attackerType: string | null = null,
    typeId: number | null = null,
    days: number | null = 30,
    limit = 10,
) {
    let calculatedTime = timeSinceEarlyDays;
    if (days) {
        calculatedTime = new Date(Date.now() - days * 86400 * 1000);
    }

    const matchFilter: any = {
        is_solo: true,
        kill_time: { $gte: calculatedTime },
    };

    // Build proper query stages to ensure we only count the right solo kills
    const query: any[] = [];

    // Stage 1: Find solo kills in the time period
    if (attackerType && typeId) {
        // Find killmails with our entity
        matchFilter[`attackers.${attackerType}`] = typeId;
    }
    query.push({ $match: matchFilter });

    // Stage 2: Project only what we need
    query.push({
        $project: {
            "attackers": 1
        }
    });

    // Stage 3: Unwind attackers
    query.push({ $unwind: "$attackers" });

    // Stage 4: Filter to only include relevant attackers with final blow
    const secondMatchStage: any = {
        "attackers.final_blow": true
    };

    // Key improvement: for entity filter, only count the entity's solo kills
    if (attackerType && typeId) {
        secondMatchStage[`attackers.${attackerType}`] = typeId;
    }
    query.push({ $match: secondMatchStage });

    // Rest of pipeline (grouping, counting, etc.)
    query.push({
        $group: {
            _id: "$attackers.character_id",
            count: { $sum: 1 },
        },
    });
    query.push({ $sort: { count: -1, _id: 1 } });
    query.push({ $limit: limit });
    query.push({
        $project: {
            id: "$_id",
            count: 1,
            _id: 0,
        },
    });

    const results = await Killmails.aggregate(query, {
        allowDiskUse: true,
    });

    // Batch load character data
    const characterIds = results.map((result) => result.id);
    const characters = await Characters.find(
        { character_id: { $in: characterIds } },
        { character_id: 1, name: 1, _id: 0 },
    ).lean();

    // Create a map for faster lookups
    const characterMap = new Map();
    characters.forEach((char) => {
        characterMap.set(char.character_id, char.name);
    });

    // Map results with character names
    return results.map((character) => ({
        character_id: character.id,
        name: characterMap.get(character.id) || "Unknown",
        count: character.count,
    }));
}

/**
 * Returns a list of top solar systems by kill count
 * @param attackerType - Optional filter for attacker type (e.g., 'ship_id')
 * @param typeId - Optional ID to filter by when attackerType is provided
 * @param days - Number of days to look back, defaults to 30
 * @param limit - Maximum number of results to return, defaults to 10
 */
async function topSystems(
    attackerType: string | null = null,
    typeId: number | null = null,
    days: number | null = 30,
    limit = 10,
) {
    let calculatedTime = timeSinceEarlyDays;
    if (days) {
        calculatedTime = new Date(Date.now() - days * 86400 * 1000);
    }

    const matchFilter: any = { kill_time: { $gte: calculatedTime } };
    if (attackerType && typeId) {
        matchFilter[`attackers.${attackerType}`] = typeId;
    }

    // Optimized query with better projection and $sum
    const query: any[] = [
        { $match: matchFilter },
        // Early projection to reduce memory usage
        { $project: { system_id: 1 } },
        {
            $group: {
                _id: "$system_id",
                count: { $sum: 1 },
            },
        },
        { $sort: { count: -1, _id: 1 } },
        { $limit: limit },
        {
            $project: {
                id: "$_id",
                count: 1,
                _id: 0,
            },
        },
    ];

    const results = await Killmails.aggregate(query, {
        allowDiskUse: true,
    });

    // Batch load system data
    const systemIds = results.map((result) => result.id);
    const systems = await SolarSystems.find(
        { system_id: { $in: systemIds } },
        { system_id: 1, system_name: 1, _id: 0 },
    ).lean();

    // Create a map for faster lookups
    const systemMap = new Map();
    systems.forEach((system) => {
        systemMap.set(system.system_id, system.system_name);
    });

    // Map results with system names
    return results.map((system) => ({
        system_id: system.id,
        name: systemMap.get(system.id) || "Unknown",
        count: system.count,
    }));
}

/**
 * Returns a list of top constellations by kill count
 * @param attackerType - Optional filter for attacker type (e.g., 'ship_id')
 * @param typeId - Optional ID to filter by when attackerType is provided
 * @param days - Number of days to look back, defaults to 30
 * @param limit - Maximum number of results to return, defaults to 10
 */
async function topConstellations(
    attackerType: string | null = null,
    typeId: number | null = null,
    days: number | null = 30,
    limit = 10,
) {
    let calculatedTime = timeSinceEarlyDays;
    if (days) {
        calculatedTime = new Date(Date.now() - days * 86400 * 1000);
    }

    const matchFilter: any = {
        kill_time: { $gte: calculatedTime },
        constellation_id: { $ne: null },
    };
    if (attackerType && typeId) {
        matchFilter[`attackers.${attackerType}`] = typeId;
    }

    // Optimized query with better projection and $sum
    const query: any[] = [
        { $match: matchFilter },
        // Early projection to reduce memory usage
        { $project: { constellation_id: 1 } },
        {
            $group: {
                _id: "$constellation_id",
                count: { $sum: 1 },
            },
        },
        { $sort: { count: -1, _id: 1 } },
        { $limit: limit },
        {
            $project: {
                id: "$_id",
                count: 1,
                _id: 0,
            },
        },
    ];

    const results = await Killmails.aggregate(query, {
        allowDiskUse: true,
    });

    // Batch load constellation data
    const constellationIds = results.map((result) => result.id);
    const constellations = await Constellations.find(
        { constellation_id: { $in: constellationIds } },
        { constellation_id: 1, constellation_name: 1, _id: 0 },
    ).lean();

    // Create a map for faster lookups
    const constellationMap = new Map();
    constellations.forEach((constellation) => {
        constellationMap.set(constellation.constellation_id, constellation.constellation_name);
    });

    // Map results with constellation names
    return results.map((constellation) => ({
        constellation_id: constellation.id,
        name: constellationMap.get(constellation.id) || "Unknown",
        count: constellation.count,
    }));
}

/**
 * Returns a list of top regions by kill count
 * @param attackerType - Optional filter for attacker type (e.g., 'ship_id')
 * @param typeId - Optional ID to filter by when attackerType is provided
 * @param days - Number of days to look back, defaults to 30
 * @param limit - Maximum number of results to return, defaults to 10
 */
async function topRegions(
    attackerType: string | null = null,
    typeId: number | null = null,
    days: number | null = 30,
    limit = 10,
) {
    let calculatedTime = timeSinceEarlyDays;
    if (days) {
        calculatedTime = new Date(Date.now() - days * 86400 * 1000);
    }

    const matchFilter: any = { kill_time: { $gte: calculatedTime } };
    if (attackerType && typeId) {
        matchFilter[`attackers.${attackerType}`] = typeId;
    }

    // Optimized query with better projection and $sum
    const query: any[] = [
        { $match: matchFilter },
        // Early projection to reduce memory usage
        { $project: { region_id: 1 } },
        {
            $group: {
                _id: "$region_id",
                count: { $sum: 1 },
            },
        },
        { $sort: { count: -1, _id: 1 } },
        { $limit: limit },
        {
            $project: {
                id: "$_id",
                count: 1,
                _id: 0,
            },
        },
    ];

    const results = await Killmails.aggregate(query, {
        allowDiskUse: true,
    });

    // Batch load region data
    const regionIds = results.map((result) => result.id);
    const regions = await Regions.find(
        { region_id: { $in: regionIds } },
        { region_id: 1, name: 1, _id: 0 },
    ).lean();

    // Create a map for faster lookups
    const regionMap = new Map();
    regions.forEach((region) => {
        regionMap.set(region.region_id, region.name);
    });

    // Map results with region names
    return results.map((region) => ({
        region_id: region.id,
        name: regionMap.get(region.id) || "Unknown",
        count: region.count,
    }));
}

/**
 * Returns a list of top ships by kill count
 * @param attackerType - Optional filter for attacker type (e.g., 'ship_id')
 * @param typeId - Optional ID to filter by when attackerType is provided
 * @param days - Number of days to look back, defaults to 30
 * @param limit - Maximum number of results to return, defaults to 10
 */
async function topShips(
    attackerType: string | null = null,
    typeId: number | null = null,
    days: number | null = 30,
    limit = 10,
) {
    let calculatedTime = timeSinceEarlyDays;
    if (days) {
        calculatedTime = new Date(Date.now() - days * 86400 * 1000);
    }

    const pipelineStages: any[] = [];

    // Stage 1: Initial match for killmails
    const initialMatchStage: any = { kill_time: { $gte: calculatedTime } };
    if (attackerType && typeId) {
        // Killmails where the specific entity is an attacker AND that entity is in a valid ship.
        initialMatchStage.attackers = {
            $elemMatch: {
                [attackerType]: typeId,
                ship_id: { $nin: [0, 670] }, // Exclude pods and 0
            },
        };
    } else {
        // General top ships: killmails must have at least one attacker in a valid ship
        initialMatchStage["attackers.ship_id"] = { $nin: [0, 670] }; // Exclude pods and 0
    }
    pipelineStages.push({ $match: initialMatchStage });

    // Stage 2: Project only the attackers array
    pipelineStages.push({ $project: { attackers: 1, _id: 0 } });

    // Stage 3: Unwind the attackers array
    pipelineStages.push({ $unwind: "$attackers" });

    // Stage 4: Match specific attackers after unwinding
    const postUnwindMatchStage: any = {};
    if (attackerType && typeId) {
        // Filter for the specific attacker's documents after unwind
        postUnwindMatchStage[`attackers.${attackerType}`] = typeId;
        // Ensure this specific attacker's ship is valid (this might be slightly redundant due to $elemMatch but is safe)
        postUnwindMatchStage["attackers.ship_id"] = { $nin: [0, 670] }; // Exclude pods and 0
    } else {
        // For general top ships, filter any unwound attacker to ensure they are in a valid ship
        postUnwindMatchStage["attackers.ship_id"] = { $nin: [0, 670] }; // Exclude pods and 0
    }
    pipelineStages.push({ $match: postUnwindMatchStage });

    // Stage 5: Group by ship_id and count
    pipelineStages.push({
        $group: {
            _id: "$attackers.ship_id",
            count: { $sum: 1 },
        },
    });

    // Stage 6: Sort
    pipelineStages.push({ $sort: { count: -1, _id: 1 } });

    // Stage 7: Limit
    pipelineStages.push({ $limit: limit });

    // Stage 8: Final projection
    pipelineStages.push({
        $project: {
            id: "$_id",
            count: 1,
            _id: 0,
        },
    });

    const results = await Killmails.aggregate(pipelineStages, {
        allowDiskUse: true,
    });

    // Batch load ship data
    const shipIds = results.map((result) => result.id);
    const ships = await InvTypes.find(
        { type_id: { $in: shipIds } },
        { type_id: 1, name: 1, _id: 0 },
    ).lean();

    // Create a map for faster lookups
    const shipMap = new Map();
    ships.forEach((ship) => {
        shipMap.set(ship.type_id, ship.name);
    });

    // Map results with ship names
    return results.map((ship) => ({
        type_id: ship.id,
        name: shipMap.get(ship.id) || "Unknown",
        count: ship.count,
    }));
}

/**
 * Returns a list of most valuable kills
 * @param days - Number of days to look back, defaults to 7
 * @param limit - Maximum number of results to return, defaults to 10
 */
async function mostValuableKills(days: number | null = 7, limit = 10) {
    let calculatedTime = timeSinceEarlyDays;
    if (days) {
        calculatedTime = new Date(Date.now() - days * 86400 * 1000);
    }

    // Use explicit projection to only fetch the fields we need
    // Use index hint to ensure the best index is used
    return await Killmails.find(
        { kill_time: { $gte: calculatedTime } },
        {
            _id: 0,
            killmail_id: 1,
            total_value: 1,
            "victim.ship_id": 1,
            "victim.ship_name": 1,
        },
    )
        .sort({ total_value: -1 })
        .limit(limit)
        .lean();
}

/**
 * Returns a list of most valuable structure kills
 * @param days - Number of days to look back, defaults to 7
 * @param limit - Maximum number of results to return, defaults to 10
 */
async function mostValuableStructures(days: number | null = 7, limit = 10) {
    let calculatedTime = timeSinceEarlyDays;
    if (days) {
        calculatedTime = new Date(Date.now() - days * 86400 * 1000);
    }
    const structureGroupIDs = [1657, 1406, 1404, 1408, 2017, 2016];

    // Use explicit projection to only fetch the fields we need
    return await Killmails.find(
        {
            kill_time: { $gte: calculatedTime },
            "victim.ship_group_id": { $in: structureGroupIDs },
        },
        {
            _id: 0,
            killmail_id: 1,
            total_value: 1,
            "victim.ship_id": 1,
            "victim.ship_name": 1,
        },
    )
        .sort({ total_value: -1 })
        .limit(limit)
        .lean();
}

/**
 * Returns a list of most valuable ship kills
 * @param days - Number of days to look back, defaults to 7
 * @param limit - Maximum number of results to return, defaults to 10
 */
async function mostValuableShips(days: number | null = 7, limit = 10) {
    let calculatedTime = timeSinceEarlyDays;
    if (days) {
        calculatedTime = new Date(Date.now() - days * 86400 * 1000);
    }

    const shipGroupIDs = [
        547, 485, 513, 902, 941, 30, 659, 419, 27, 29, 26, 420, 25, 28, 463, 237, 31, 324, 898, 906,
        540, 830, 893, 543, 541, 833, 358, 894, 831, 832, 900, 834, 380, 963, 1305,
    ];

    // Use explicit projection to only fetch the fields we need
    // Use index hint to ensure the best index is used
    return await Killmails.find(
        {
            kill_time: { $gte: calculatedTime },
            "victim.ship_group_id": { $in: shipGroupIDs },
        },
        {
            _id: 0,
            killmail_id: 1,
            total_value: 1,
            "victim.ship_id": 1,
            "victim.ship_name": 1,
        },
    )
        .sort({ total_value: -1 })
        .limit(limit)
        .lean();
}

/**
 * Returns the total count of killmails within a given time period
 * @param days - Number of days to look back, defaults to 7
 */
async function killCount(days: number | null = 7) {
    let calculatedTime = timeSinceEarlyDays;
    if (days) {
        calculatedTime = new Date(Date.now() - days * 86400 * 1000);
    }

    const query: any[] = [{ $match: { kill_time: { $gte: calculatedTime } } }, { $count: "count" }];

    // Use the optimized kill_time index
    return await Killmails.aggregate(query, {
        allowDiskUse: true,
        hint: { kill_time: -1 },
    });
}

async function newCharacters() {
    const thresholdDate = new Date("2003-01-01T00:00:00Z");

    const query: any[] = [
        {
            $match: {
                birthday: { $gte: thresholdDate },
            },
        },
        {
            $group: {
                _id: {
                    year: { $year: "$birthday" },
                    month: { $month: "$birthday" },
                    day: { $dayOfMonth: "$birthday" },
                },
                count: { $sum: 1 },
            },
        },
        { $sort: { "_id.year": 1, "_id.month": 1, "_id.day": 1 } },
    ];

    return await Characters.aggregate(query, { allowDiskUse: true });
}

export {
    killCount, mostValuableKills, mostValuableShips, mostValuableStructures, newCharacters, topAlliances, topCharacters, topConstellations, topCorporations, topRegions,
    topShips,
    topSolo, topSystems
};

