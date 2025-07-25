import { createError } from "h3";
import { type ITranslation } from "../interfaces/ITranslation";
import { type IKillmail } from "../interfaces/IKillmail";
import { type IInvGroup } from "../interfaces/IInvGroup";
import { Killmails, type IKillmailDocument } from "../models/Killmails";
import { InvGroups, type IInvGroupDocument } from "../models/InvGroups";

/**
 * Interface representing the output of advanced view statistics.
 * Based on ICampaignOutput but adapted for query-based filters.
 */
export interface IAdvancedViewOutput {
    // Query metadata
    query: Record<string, any>;
    totalKillmails: number;
    isApproximate?: boolean; // Indicates if sampling was used

    // Advanced view statistics
    totalKills: number;
    iskDestroyed: number;
    shipGroupStats: Array<{
        ship_group_id: number;
        ship_group_name: string | ITranslation;
        killed: number;
    }>;

    // Character statistics
    topKillersByCharacter: Array<{
        character_id: number;
        character_name: string;
        kills: number;
    }>;
    topVictimsByCharacter: Array<{
        character_id: number;
        character_name: string;
        losses: number;
    }>;
    topDamageDealersByCharacter: Array<{
        character_id: number;
        character_name: string;
        damageDone: number;
    }>;

    // Corporation statistics
    topKillersByCorporation: Array<{
        corporation_id: number;
        corporation_name: string;
        kills: number;
    }>;

    // Alliance statistics
    topKillersByAlliance: Array<{
        alliance_id: number;
        alliance_name: string;
        kills: number;
    }>;

    // Most valuable kills
    mostValuableKills: Array<{
        killmail_id: number;
        total_value: number;
        victim: {
            ship_id: number;
            ship_name: string | ITranslation;
            character_id?: number;
            character_name?: string;
            corporation_id?: number;
            corporation_name?: string;
            alliance_id?: number;
            alliance_name?: string;
        };
        final_blow?: {
            character_id?: number;
            character_name?: string;
            ship_id: number;
            ship_name: string | ITranslation;
        };
    }>;
}

/**
 * Get valid ship group IDs from InvGroups where category_id = 6 (Ships) and published = true
 */
async function getValidShipGroupIds(): Promise<Set<number>> {
    const shipGroups = await InvGroups.find(
        { category_id: 6, published: true },
        { group_id: 1 }
    ).lean();

    return new Set(shipGroups.map((group: any) => group.group_id));
}

/**
 * Convert string dates in a query to proper Date objects for MongoDB
 */
function normalizeQueryDates(query: Record<string, any>): Record<string, any> {
    const normalizedQuery = JSON.parse(JSON.stringify(query)); // Deep clone

    function convertDates(obj: any): any {
        if (obj && typeof obj === "object") {
            if (Array.isArray(obj)) {
                return obj.map(convertDates);
            }

            const result: any = {};
            for (const [key, value] of Object.entries(obj)) {
                if (key === "kill_time" && value && typeof value === "object") {
                    result[key] = {};
                    for (const [op, dateValue] of Object.entries(
                        value as any
                    )) {
                        if (typeof dateValue === "string") {
                            result[key][op] = new Date(dateValue);
                        } else {
                            result[key][op] = dateValue;
                        }
                    }
                } else if (typeof value === "object") {
                    result[key] = convertDates(value);
                } else {
                    result[key] = value;
                }
            }
            return result;
        }
        return obj;
    }

    return convertDates(normalizedQuery);
}

/**
 * Generate advanced view statistics based on a MongoDB query.
 * Uses direct MongoDB aggregations for efficiency.
 *
 * @param query - The MongoDB query object to filter killmails
 * @returns An object containing the advanced view statistics
 */
async function generateAdvancedViewStats(
    query: Record<string, any>
): Promise<IAdvancedViewOutput> {
    // Normalize query dates to proper Date objects
    const normalizedQuery = normalizeQueryDates(query);

    console.log(
        `Advanced view stats - Generating statistics with direct aggregations`
    );

    // Initialize statistics
    const stats: IAdvancedViewOutput = {
        query,
        totalKillmails: 0,
        totalKills: 0,
        iskDestroyed: 0,
        shipGroupStats: [],
        topKillersByCharacter: [],
        topVictimsByCharacter: [],
        topDamageDealersByCharacter: [],
        topKillersByCorporation: [],
        topKillersByAlliance: [],
        mostValuableKills: [],
        isApproximate: false,
    };

    // Get valid ship group IDs (category_id = 6, published = true)
    const validShipGroupIds = await getValidShipGroupIds();

    // Get all statistics using direct MongoDB aggregations in parallel
    const [
        basicStats,
        shipGroupStats,
        topKillers,
        topVictims,
        topDamageDealers,
        topKillersCorporations,
        topKillersAlliances,
        mostValuableKills,
    ] = await Promise.all([
        // Basic stats (total count, total kills, ISK destroyed)
        (async () => {
            try {
                const [countResult, aggregateResult] = await Promise.all([
                    Killmails.countDocuments(normalizedQuery).maxTimeMS(30000),
                    Killmails.aggregate([
                        { $match: normalizedQuery },
                        {
                            $group: {
                                _id: null,
                                totalKills: { $sum: 1 },
                                iskDestroyed: { $sum: "$total_value" },
                            },
                        },
                    ] as any[]),
                ]);

                return {
                    totalKillmails: countResult,
                    totalKills:
                        aggregateResult.length > 0
                            ? aggregateResult[0].totalKills
                            : 0,
                    iskDestroyed:
                        aggregateResult.length > 0
                            ? aggregateResult[0].iskDestroyed
                            : 0,
                };
            } catch (error) {
                console.warn("Could not get basic stats, using defaults");
                return { totalKillmails: 0, totalKills: 0, iskDestroyed: 0 };
            }
        })(),

        // Ship group stats
        (async () => {
            const pipeline = [
                { $match: normalizedQuery },
                { $unwind: "$attackers" },
                {
                    $match: {
                        "attackers.ship_group_id": {
                            $in: Array.from(validShipGroupIds),
                        },
                    },
                },
                {
                    $group: {
                        _id: "$attackers.ship_group_id",
                        ship_group_name: {
                            $first: "$attackers.ship_group_name",
                        },
                        killed: { $sum: 1 },
                    },
                },
                {
                    $project: {
                        ship_group_id: "$_id",
                        ship_group_name: 1,
                        killed: 1,
                        _id: 0,
                    },
                },
            ] as any[];
            return await Killmails.aggregate(pipeline);
        })(),

        // Top killers by character
        (async () => {
            const pipeline = [
                { $match: normalizedQuery },
                { $unwind: "$attackers" },
                {
                    $match: {
                        "attackers.character_id": { $exists: true, $ne: null },
                        "attackers.character_name": {
                            $exists: true,
                            $ne: null,
                        },
                    },
                },
                {
                    $group: {
                        _id: "$attackers.character_id",
                        character_name: { $first: "$attackers.character_name" },
                        kills: { $sum: 1 },
                    },
                },
                { $sort: { kills: -1 } },
                { $limit: 10 },
                {
                    $project: {
                        character_id: "$_id",
                        character_name: 1,
                        kills: 1,
                        _id: 0,
                    },
                },
            ] as any[];
            return await Killmails.aggregate(pipeline);
        })(),

        // Top victims by character
        (async () => {
            const pipeline = [
                { $match: normalizedQuery },
                {
                    $match: {
                        "victim.character_id": { $exists: true, $ne: null },
                        "victim.character_name": { $exists: true, $ne: null },
                    },
                },
                {
                    $group: {
                        _id: "$victim.character_id",
                        character_name: { $first: "$victim.character_name" },
                        losses: { $sum: 1 },
                    },
                },
                { $sort: { losses: -1 } },
                { $limit: 10 },
                {
                    $project: {
                        character_id: "$_id",
                        character_name: 1,
                        losses: 1,
                        _id: 0,
                    },
                },
            ] as any[];
            return await Killmails.aggregate(pipeline);
        })(),

        // Top damage dealers by character (using total_value as damage proxy)
        (async () => {
            const pipeline = [
                { $match: normalizedQuery },
                { $unwind: "$attackers" },
                {
                    $match: {
                        "attackers.character_id": { $exists: true, $ne: null },
                        "attackers.character_name": {
                            $exists: true,
                            $ne: null,
                        },
                    },
                },
                {
                    $group: {
                        _id: "$attackers.character_id",
                        character_name: { $first: "$attackers.character_name" },
                        totalDamageValue: { $sum: "$total_value" },
                        killCount: { $sum: 1 },
                    },
                },
                {
                    $project: {
                        character_id: "$_id",
                        character_name: 1,
                        damageDone: {
                            $divide: ["$totalDamageValue", "$killCount"],
                        }, // Average damage per kill
                        _id: 0,
                    },
                },
                { $sort: { damageDone: -1 } },
                { $limit: 10 },
            ] as any[];
            return await Killmails.aggregate(pipeline);
        })(),

        // Top killers by corporation
        (async () => {
            const pipeline = [
                { $match: normalizedQuery },
                { $unwind: "$attackers" },
                {
                    $match: {
                        "attackers.corporation_id": {
                            $exists: true,
                            $ne: null,
                        },
                        "attackers.corporation_name": {
                            $exists: true,
                            $ne: null,
                        },
                    },
                },
                {
                    $group: {
                        _id: "$attackers.corporation_id",
                        corporation_name: {
                            $first: "$attackers.corporation_name",
                        },
                        kills: { $sum: 1 },
                    },
                },
                { $sort: { kills: -1 } },
                { $limit: 10 },
                {
                    $project: {
                        corporation_id: "$_id",
                        corporation_name: 1,
                        kills: 1,
                        _id: 0,
                    },
                },
            ] as any[];
            return await Killmails.aggregate(pipeline);
        })(),

        // Top killers by alliance
        (async () => {
            const pipeline = [
                { $match: normalizedQuery },
                { $unwind: "$attackers" },
                {
                    $match: {
                        "attackers.alliance_id": { $exists: true, $ne: null },
                        "attackers.alliance_name": { $exists: true, $ne: null },
                    },
                },
                {
                    $group: {
                        _id: "$attackers.alliance_id",
                        alliance_name: { $first: "$attackers.alliance_name" },
                        kills: { $sum: 1 },
                    },
                },
                { $sort: { kills: -1 } },
                { $limit: 10 },
                {
                    $project: {
                        alliance_id: "$_id",
                        alliance_name: 1,
                        kills: 1,
                        _id: 0,
                    },
                },
            ] as any[];
            return await Killmails.aggregate(pipeline);
        })(),

        // Most valuable kills
        (async () => {
            const pipeline = [
                { $match: normalizedQuery },
                { $sort: { total_value: -1 } },
                { $limit: 10 },
                {
                    $project: {
                        killmail_id: 1,
                        total_value: 1,
                        victim: 1,
                        attackers: {
                            $filter: {
                                input: "$attackers",
                                cond: { $eq: ["$$this.final_blow", true] },
                            },
                        },
                        _id: 0,
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
                        "victim.ship_id": 1,
                        "victim.ship_name": 1,
                        "victim.character_id": 1,
                        "victim.character_name": 1,
                        "victim.corporation_id": 1,
                        "victim.corporation_name": 1,
                        "victim.alliance_id": 1,
                        "victim.alliance_name": 1,
                        "final_blow.character_id": 1,
                        "final_blow.character_name": 1,
                        "final_blow.ship_id": 1,
                        "final_blow.ship_name": 1,
                    },
                },
            ] as any[];
            const results = await Killmails.aggregate(pipeline);
            return results.map((km: any) => ({
                killmail_id: km.killmail_id,
                total_value: km.total_value,
                victim: {
                    ship_id: km.victim?.ship_id || 0,
                    ship_name: km.victim?.ship_name || "Unknown",
                    character_id: km.victim?.character_id,
                    character_name: km.victim?.character_name,
                    corporation_id: km.victim?.corporation_id,
                    corporation_name: km.victim?.corporation_name,
                    alliance_id: km.victim?.alliance_id,
                    alliance_name: km.victim?.alliance_name,
                },
                final_blow: km.final_blow
                    ? {
                          character_id: km.final_blow.character_id,
                          character_name: km.final_blow.character_name,
                          ship_id: km.final_blow.ship_id || 0,
                          ship_name: km.final_blow.ship_name || "Unknown",
                      }
                    : undefined,
            }));
        })(),
    ]);

    // Set final stats from the aggregation results
    stats.totalKillmails = basicStats.totalKillmails;
    stats.totalKills = basicStats.totalKills;
    stats.iskDestroyed = basicStats.iskDestroyed;
    stats.shipGroupStats = shipGroupStats;
    stats.topKillersByCharacter = topKillers;
    stats.topVictimsByCharacter = topVictims;
    stats.topDamageDealersByCharacter = topDamageDealers;
    stats.topKillersByCorporation = topKillersCorporations;
    stats.topKillersByAlliance = topKillersAlliances;
    stats.mostValuableKills = mostValuableKills;

    // Debug: Log final array sizes
    console.log(
        `Final stats: totalKills=${stats.totalKills}, shipGroups=${shipGroupStats.length}, topKillers=${topKillers.length}, topVictims=${topVictims.length}, topDamage=${topDamageDealers.length}, topCorps=${topKillersCorporations.length}, topAlliances=${topKillersAlliances.length}, mostValuable=${mostValuableKills.length}`
    );

    if (topKillers.length > 0) {
        console.log(`Sample top killer:`, topKillers[0]);
    }
    if (shipGroupStats.length > 0) {
        console.log(`Sample ship group:`, shipGroupStats[0]);
    }

    return stats;
}

// Default export the function
export default generateAdvancedViewStats;

// Also export as named export for compatibility
export { generateAdvancedViewStats };
