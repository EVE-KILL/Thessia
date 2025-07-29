import { type ITranslation } from "../interfaces/ITranslation";
import { InvGroups } from "../models/InvGroups";
import { Killmails } from "../models/Killmails";

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
 * Uses MongoDB aggregation pipelines for optimal performance.
 *
 * @param query - The MongoDB query object to filter killmails
 * @returns An object containing the advanced view statistics
 */
async function generateAdvancedViewStats(
    query: Record<string, any>
): Promise<IAdvancedViewOutput> {
    const startTime = Date.now();

    // Normalize query dates to proper Date objects
    const normalizedQuery = normalizeQueryDates(query);

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

    // Create aggregation pipeline for efficient statistics generation
    const pipeline: any[] = [{ $match: normalizedQuery }];

    // Use $facet to calculate multiple statistics in parallel
    pipeline.push({
        $facet: {
            // Basic totals
            totals: [
                {
                    $group: {
                        _id: null,
                        totalKills: { $sum: 1 },
                        iskDestroyed: { $sum: "$total_value" },
                    },
                },
            ],

            // Ship group statistics (only valid ship groups)
            shipStats: [
                {
                    $match: {
                        "victim.ship_group_id": {
                            $in: Array.from(validShipGroupIds),
                        },
                    },
                },
                {
                    $group: {
                        _id: "$victim.ship_group_id",
                        ship_group_name: { $first: "$victim.ship_group_name" },
                        killed: { $sum: 1 },
                    },
                },
                { $sort: { killed: -1 } },
                { $limit: 20 },
                {
                    $project: {
                        _id: 0,
                        ship_group_id: "$_id",
                        ship_group_name: 1,
                        killed: 1,
                    },
                },
            ],

            // Top killers by character
            topKillersChar: [
                {
                    $match: {
                        "attackers.character_id": { $ne: 0 },
                    },
                },
                { $unwind: "$attackers" },
                {
                    $match: {
                        "attackers.character_id": { $ne: 0 },
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
                        _id: 0,
                        character_id: "$_id",
                        character_name: 1,
                        kills: 1,
                    },
                },
            ],

            // Top victims by character
            topVictimsChar: [
                {
                    $match: {
                        "victim.character_id": { $ne: 0 },
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
                        _id: 0,
                        character_id: "$_id",
                        character_name: 1,
                        losses: 1,
                    },
                },
            ],

            // Top damage dealers by character (using total_value as proxy)
            topDamageChar: [
                {
                    $match: {
                        "attackers.character_id": { $ne: 0 },
                    },
                },
                { $unwind: "$attackers" },
                {
                    $match: {
                        "attackers.character_id": { $ne: 0 },
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
                    $addFields: {
                        avgDamage: {
                            $cond: [
                                { $gt: ["$killCount", 0] },
                                {
                                    $divide: [
                                        "$totalDamageValue",
                                        "$killCount",
                                    ],
                                },
                                0,
                            ],
                        },
                    },
                },
                { $sort: { avgDamage: -1 } },
                { $limit: 10 },
                {
                    $project: {
                        _id: 0,
                        character_id: "$_id",
                        character_name: 1,
                        damageDone: { $round: ["$avgDamage"] },
                    },
                },
            ],

            // Top killers by corporation
            topKillersCorp: [
                {
                    $match: {
                        "attackers.corporation_id": { $ne: 0 },
                    },
                },
                { $unwind: "$attackers" },
                {
                    $match: {
                        "attackers.corporation_id": { $ne: 0 },
                    },
                },
                {
                    $group: {
                        _id: {
                            killmail_id: "$killmail_id",
                            corporation_id: "$attackers.corporation_id",
                        },
                        corporation_name: {
                            $first: "$attackers.corporation_name",
                        },
                    },
                },
                {
                    $group: {
                        _id: "$_id.corporation_id",
                        corporation_name: { $first: "$corporation_name" },
                        kills: { $sum: 1 },
                    },
                },
                { $sort: { kills: -1 } },
                { $limit: 10 },
                {
                    $project: {
                        _id: 0,
                        corporation_id: "$_id",
                        corporation_name: 1,
                        kills: 1,
                    },
                },
            ],

            // Top killers by alliance
            topKillersAlliance: [
                {
                    $match: {
                        "attackers.alliance_id": { $ne: 0 },
                    },
                },
                { $unwind: "$attackers" },
                {
                    $match: {
                        "attackers.alliance_id": { $ne: 0 },
                    },
                },
                {
                    $group: {
                        _id: {
                            killmail_id: "$killmail_id",
                            alliance_id: "$attackers.alliance_id",
                        },
                        alliance_name: { $first: "$attackers.alliance_name" },
                    },
                },
                {
                    $group: {
                        _id: "$_id.alliance_id",
                        alliance_name: { $first: "$alliance_name" },
                        kills: { $sum: 1 },
                    },
                },
                { $sort: { kills: -1 } },
                { $limit: 10 },
                {
                    $project: {
                        _id: 0,
                        alliance_id: "$_id",
                        alliance_name: 1,
                        kills: 1,
                    },
                },
            ],

            // Most valuable kills
            mostValuable: [
                { $sort: { total_value: -1 } },
                { $limit: 15 }, // Get a few extra to allow for filtering
                {
                    $addFields: {
                        final_blow: {
                            $arrayElemAt: [
                                {
                                    $filter: {
                                        input: "$attackers",
                                        cond: {
                                            $eq: ["$$this.final_blow", true],
                                        },
                                    },
                                },
                                0,
                            ],
                        },
                    },
                },
            ],
        },
    });

    // Execute aggregation with extended timeout and disk usage for large datasets
    const aggStartTime = Date.now();
    const result = await Killmails.aggregate(pipeline)
        .option({
            allowDiskUse: true, // Allow disk usage for large aggregations
        })
        .exec();
    const aggTime = Date.now() - aggStartTime;

    // Process aggregation results
    const [aggregationResult] = result;

    // Extract totals
    const totals = aggregationResult.totals[0] || {
        totalKills: 0,
        iskDestroyed: 0,
    };
    stats.totalKillmails = totals.totalKills;
    stats.totalKills = totals.totalKills;
    stats.iskDestroyed = totals.iskDestroyed;

    // Process ship group statistics
    stats.shipGroupStats = aggregationResult.shipStats;

    // Process character statistics
    stats.topKillersByCharacter = aggregationResult.topKillersChar;

    stats.topVictimsByCharacter = aggregationResult.topVictimsChar;

    stats.topDamageDealersByCharacter = aggregationResult.topDamageChar;

    // Process corporation statistics
    stats.topKillersByCorporation = aggregationResult.topKillersCorp;

    // Process alliance statistics
    stats.topKillersByAlliance = aggregationResult.topKillersAlliance;

    // Process most valuable kills
    stats.mostValuableKills = aggregationResult.mostValuable.map(
        (killmail: any) => ({
            killmail_id: killmail.killmail_id,
            total_value: killmail.total_value,
            victim: {
                ship_id: killmail.victim?.ship_id || 0,
                ship_name: killmail.victim?.ship_name || "Unknown",
                character_id: killmail.victim?.character_id,
                character_name: killmail.victim?.character_name,
                corporation_id: killmail.victim?.corporation_id,
                corporation_name: killmail.victim?.corporation_name,
                alliance_id: killmail.victim?.alliance_id,
                alliance_name: killmail.victim?.alliance_name,
            },
            final_blow: killmail.final_blow
                ? {
                      character_id: killmail.final_blow.character_id,
                      character_name: killmail.final_blow.character_name,
                      ship_id: killmail.final_blow.ship_id || 0,
                      ship_name: killmail.final_blow.ship_name || "Unknown",
                  }
                : undefined,
        })
    );

    const totalTime = Date.now() - startTime;
    return stats;
}

// Default export the function
export default generateAdvancedViewStats;

// Also export as named export for compatibility
export { generateAdvancedViewStats };
