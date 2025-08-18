import { createHash } from "crypto";

interface QueryParams {
    entityType?: string;
    listType?: string;
    period?: "1d" | "7d" | "14d" | "30d";
    limit?: string;
    offset?: string;
    sort?: string;
}

export default defineCachedEventHandler(
    async (event) => {
        const query = getQuery(event) as QueryParams;
        const {
            entityType,
            listType,
            period,
            limit: limitStr,
            offset: offsetStr,
            sort,
        } = query;

        // Parameter Validation
        if (
            !entityType ||
            (entityType !== "alliance" && entityType !== "corporation")
        ) {
            event.node.res.statusCode = 400;
            return {
                error: 'Invalid or missing entityType. Must be "alliance" or "corporation".',
            };
        }

        const validListTypes = [
            "largest",
            "growing",
            "shrinking",
            "most_pirate",
            "most_carebear",
            "newest",
            "highest_achievement_points",
            "lowest_achievement_points",
        ];
        if (!listType || !validListTypes.includes(listType)) {
            event.node.res.statusCode = 400;
            return {
                error: `Invalid or missing listType. Must be one of: ${validListTypes.join(
                    ", "
                )}.`,
            };
        }

        if ((listType === "growing" || listType === "shrinking") && !period) {
            event.node.res.statusCode = 400;
            return {
                error: 'Parameter "period" is required for listType "growing" or "shrinking".',
            };
        }

        const validPeriods = ["1d", "7d", "14d", "30d"];
        if (period && !validPeriods.includes(period)) {
            event.node.res.statusCode = 400;
            return {
                error: `Invalid period. Must be one of: ${validPeriods.join(
                    ", "
                )}.`,
            };
        }

        const limit = limitStr ? parseInt(limitStr, 10) : 10;
        const offset = offsetStr ? parseInt(offsetStr, 10) : 0;

        if (isNaN(limit) || limit <= 0 || limit > 100) {
            event.node.res.statusCode = 400;
            return {
                error: "Invalid limit. Must be a positive integer less than or equal to 100.",
            };
        }
        if (isNaN(offset) || offset < 0) {
            event.node.res.statusCode = 400;
            return { error: "Invalid offset. Must be a non-negative integer." };
        }

        try {
            // Base query for HistoricalStats - directly filter at DB level
            const mongoQuery: any =
                entityType === "alliance"
                    ? {
                          corporation_id: 0,
                          alliance_id: {
                              $ne: 0,
                          },
                      }
                    : {
                          alliance_id: 0,
                          corporation_id: {
                              $ne: 0,
                              $gt: 1999999,
                          },
                      };

            // Determine sort order at the database level
            let sortQuery: any = {};
            const periodField = period ? `change_${period}` : null;

            switch (listType) {
                case "largest":
                    sortQuery = { count: -1 };
                    break;
                case "growing":
                    // Make sure we have valid change values and they're positive
                    if (periodField) {
                        sortQuery[periodField] = -1;
                        mongoQuery[periodField] = { $ne: null, $gt: 0 };
                    }
                    break;
                case "shrinking":
                    // Make sure we have valid change values and they're negative
                    if (periodField) {
                        sortQuery[periodField] = 1;
                        mongoQuery[periodField] = { $ne: null, $lt: 0 };
                    }
                    break;
                case "most_pirate":
                    // Only include entities with negative security status and at least 10 members
                    mongoQuery.avg_sec_status = { $lt: 0 };
                    mongoQuery.count = { $gte: 10 };

                    // Use aggregation to calculate a weighted pirate score
                    return await calculateWeightedSecurityRanking(
                        entityType,
                        mongoQuery,
                        "pirate",
                        limit,
                        offset
                    );

                case "most_carebear":
                    // Only include entities with positive security status and at least 10 members
                    mongoQuery.avg_sec_status = { $gt: 0 };
                    mongoQuery.count = { $gte: 10 };

                    // Use aggregation to calculate a weighted carebear score
                    return await calculateWeightedSecurityRanking(
                        entityType,
                        mongoQuery,
                        "carebear",
                        limit,
                        offset
                    );

                case "highest_achievement_points":
                    // Sort by total achievement points descending
                    sortQuery = { total_achievement_points: -1 };
                    mongoQuery.total_achievement_points = { $ne: null, $gt: 0 };
                    break;

                case "lowest_achievement_points":
                    // Sort by total achievement points ascending
                    sortQuery = { total_achievement_points: 1 };
                    mongoQuery.total_achievement_points = { $ne: null };
                    break;

                case "newest":
                    // We'll handle newest specially below by fetching from Alliance/Corp collections
                    break;
            }

            // Special case for newest entities
            if (listType === "newest") {
                let entityInfo = [];
                if (entityType === "alliance") {
                    entityInfo = await Alliances.find({})
                        .select("alliance_id name date_founded")
                        .sort({ date_founded: -1 })
                        .limit(limit)
                        .skip(offset)
                        .lean();

                    // Get the stats for these alliances
                    const allianceIds = entityInfo.map((a) => a.alliance_id);
                    const statsData = await HistoricalStats.find({
                        alliance_id: { $in: allianceIds },
                        corporation_id: 0,
                    }).lean();

                    const statsMap = new Map(
                        statsData.map((stat) => [stat.alliance_id, stat])
                    );

                    return entityInfo.map((alliance) => ({
                        id: alliance.alliance_id,
                        name: alliance.name,
                        type: "alliance",
                        date_founded: alliance.date_founded,
                        member_count:
                            statsMap.get(alliance.alliance_id)?.count || 0,
                        change_1d:
                            statsMap.get(alliance.alliance_id)?.change_1d ||
                            null,
                        change_7d:
                            statsMap.get(alliance.alliance_id)?.change_7d ||
                            null,
                        change_14d:
                            statsMap.get(alliance.alliance_id)?.change_14d ||
                            null,
                        change_30d:
                            statsMap.get(alliance.alliance_id)?.change_30d ||
                            null,
                        pirate_members:
                            statsMap.get(alliance.alliance_id)
                                ?.pirate_members || 0,
                        carebear_members:
                            statsMap.get(alliance.alliance_id)
                                ?.carebear_members || 0,
                        sum_sec_status:
                            statsMap.get(alliance.alliance_id)
                                ?.sum_sec_status || 0,
                        avg_sec_status:
                            statsMap.get(alliance.alliance_id)
                                ?.avg_sec_status || 0,
                        total_achievement_points:
                            statsMap.get(alliance.alliance_id)
                                ?.total_achievement_points || 0,
                        avg_achievement_points:
                            statsMap.get(alliance.alliance_id)
                                ?.avg_achievement_points || 0,
                        top_achievement_character_id:
                            statsMap.get(alliance.alliance_id)
                                ?.top_achievement_character_id || null,
                        top_achievement_character_points:
                            statsMap.get(alliance.alliance_id)
                                ?.top_achievement_character_points || 0,
                    }));
                } else {
                    entityInfo = await Corporations.find({
                        corporation_id: { $gt: 1999999 },
                    })
                        .select("corporation_id name date_founded")
                        .sort({ date_founded: -1 })
                        .limit(limit)
                        .skip(offset)
                        .lean();

                    // Get the stats for these corporations
                    const corpIds = entityInfo.map((c) => c.corporation_id);
                    const statsData = await HistoricalStats.find({
                        alliance_id: 0,
                        corporation_id: { $in: corpIds },
                    }).lean();

                    const statsMap = new Map(
                        statsData.map((stat) => [stat.corporation_id, stat])
                    );

                    return entityInfo.map((corp) => ({
                        id: corp.corporation_id,
                        name: corp.name,
                        type: "corporation",
                        date_founded: corp.date_founded,
                        member_count:
                            statsMap.get(corp.corporation_id)?.count || 0,
                        change_1d:
                            statsMap.get(corp.corporation_id)?.change_1d ||
                            null,
                        change_7d:
                            statsMap.get(corp.corporation_id)?.change_7d ||
                            null,
                        change_14d:
                            statsMap.get(corp.corporation_id)?.change_14d ||
                            null,
                        change_30d:
                            statsMap.get(corp.corporation_id)?.change_30d ||
                            null,
                        pirate_members:
                            statsMap.get(corp.corporation_id)?.pirate_members ||
                            0,
                        carebear_members:
                            statsMap.get(corp.corporation_id)
                                ?.carebear_members || 0,
                        sum_sec_status:
                            statsMap.get(corp.corporation_id)?.sum_sec_status ||
                            0,
                        avg_sec_status:
                            statsMap.get(corp.corporation_id)?.avg_sec_status ||
                            0,
                        total_achievement_points:
                            statsMap.get(corp.corporation_id)
                                ?.total_achievement_points || 0,
                        avg_achievement_points:
                            statsMap.get(corp.corporation_id)
                                ?.avg_achievement_points || 0,
                        top_achievement_character_id:
                            statsMap.get(corp.corporation_id)
                                ?.top_achievement_character_id || null,
                        top_achievement_character_points:
                            statsMap.get(corp.corporation_id)
                                ?.top_achievement_character_points || 0,
                    }));
                }
            }

            // Apply pagination and select fields
            const entityQuery = HistoricalStats.find(mongoQuery)
                .select(
                    `
                alliance_id corporation_id count date
                pirate_members carebear_members sum_sec_status avg_sec_status
                change_1d change_7d change_14d change_30d
                total_achievement_points avg_achievement_points top_achievement_character_id top_achievement_character_points
            `
                )
                .sort(sortQuery)
                .skip(offset)
                .limit(limit)
                .lean();

            const historicalData = await entityQuery;

            // Extract entity IDs for lookup
            const entityIds = historicalData.map((item) =>
                entityType === "alliance"
                    ? item.alliance_id
                    : item.corporation_id
            );

            // Get entity info
            let entityInfo = [];
            if (entityType === "alliance") {
                entityInfo = await Alliances.find({
                    alliance_id: { $in: entityIds },
                })
                    .select("alliance_id name date_founded")
                    .lean();
            } else {
                entityInfo = await Corporations.find({
                    corporation_id: { $in: entityIds },
                })
                    .select("corporation_id name date_founded")
                    .lean();
            }

            // Create map for quick lookups
            const entityInfoMap = new Map(
                entityInfo.map((e) => {
                    const id =
                        entityType === "alliance"
                            ? (e as any).alliance_id
                            : (e as any).corporation_id;
                    return [
                        id,
                        { name: e.name, date_founded: (e as any).date_founded },
                    ];
                })
            );

            // Format response with minimal data
            let finalResponse = historicalData.map((stat) => {
                const entityId =
                    entityType === "alliance"
                        ? stat.alliance_id
                        : stat.corporation_id;
                const info = entityInfoMap.get(entityId) || { name: "Unknown" };

                return {
                    id: entityId,
                    name: info.name,
                    type: entityType,
                    member_count: stat.count,
                    change_1d: stat.change_1d,
                    change_7d: stat.change_7d,
                    change_14d: stat.change_14d,
                    change_30d: stat.change_30d,
                    pirate_members: stat.pirate_members,
                    carebear_members: stat.carebear_members,
                    sum_sec_status: stat.sum_sec_status,
                    avg_sec_status: stat.avg_sec_status,
                    total_achievement_points: stat.total_achievement_points,
                    avg_achievement_points: stat.avg_achievement_points,
                    top_achievement_character_id:
                        stat.top_achievement_character_id,
                    top_achievement_character_points:
                        stat.top_achievement_character_points,
                    date_founded: info.date_founded,
                    last_active: stat.date,
                } as any; // Cast to any to bypass potential type issues with date_founded
            });

            return finalResponse;
        } catch (error) {
            console.error("API Error in /historicalstats/entities:", error);
            event.node.res.statusCode = 500;
            return { error: "Internal Server Error" };
        }
    },
    {
        maxAge: 3600,
        staleMaxAge: -1,
        swr: true,
        getKey: (event) => {
            const query = getQuery(event) as QueryParams;
            const { entityType, listType, period, limit, offset, sort } = query;

            // Create a hash of the parameters to avoid key length issues
            const keyContent = `${entityType}:${listType}:${period}:${limit}:${offset}:${sort}`;
            const hash = createHash("sha256")
                .update(keyContent)
                .digest("hex")
                .substring(0, 16);

            return `hs:e:${hash}`;
        },
    }
);

/**
 * Calculates weighted security rankings that balance avg_sec_status with member count
 * @param entityType 'alliance' or 'corporation'
 * @param baseQuery The base MongoDB query
 * @param rankingType 'pirate' | 'carebear'  // Fixed: changed "or" to "|" for union type
 * @param limit Number of results to return
 * @param offset Offset for pagination
 * @returns Formatted ranking results
 */
async function calculateWeightedSecurityRanking(
    entityType: string,
    baseQuery: any,
    rankingType: "pirate" | "carebear", // Fixed: changed "or" to "|" for union type
    limit: number,
    offset: number
): Promise<any[]> {
    // Create an aggregation pipeline to calculate the weighted score
    const pipeline = [
        { $match: baseQuery },
        {
            $addFields: {
                // For pirates: More negative score = better ranking
                // For carebears: More positive score = better ranking
                // We use natural logarithm to dampen the effect of very large member counts
                weighted_score: {
                    $multiply: [
                        "$avg_sec_status",
                        { $ln: { $max: ["$count", 10] } },
                    ],
                },
            },
        },
        {
            $sort:
                rankingType === "pirate"
                    ? { weighted_score: 1 } // For pirates: Lower (more negative) is better
                    : { weighted_score: -1 }, // For carebears: Higher (more positive) is better
        },
        { $skip: offset },
        { $limit: limit },
        {
            $project: {
                _id: 0,
                entityId:
                    rankingType === "pirate"
                        ? entityType === "alliance"
                            ? "$alliance_id"
                            : "$corporation_id"
                        : entityType === "alliance"
                        ? "$alliance_id"
                        : "$corporation_id",
                count: 1,
                pirate_members: 1,
                carebear_members: 1,
                sum_sec_status: 1,
                avg_sec_status: 1,
                change_1d: 1,
                change_7d: 1,
                change_14d: 1,
                change_30d: 1,
                weighted_score: 1,
            },
        },
    ];

    const results = await HistoricalStats.aggregate(pipeline);

    // Fetch entity details
    const entityIds = results.map((item) => item.entityId);
    let entityInfo = [];

    if (entityType === "alliance") {
        entityInfo = await Alliances.find({ alliance_id: { $in: entityIds } })
            .select("alliance_id name date_founded")
            .lean();
    } else {
        entityInfo = await Corporations.find({
            corporation_id: { $in: entityIds },
        })
            .select("corporation_id name date_founded")
            .lean();
    }

    const entityInfoMap = new Map(
        entityInfo.map((e) => {
            const id =
                entityType === "alliance"
                    ? (e as any).alliance_id
                    : (e as any).corporation_id;
            return [
                id,
                { name: e.name, date_founded: (e as any).date_founded },
            ];
        })
    );

    // Format the results
    return results.map((item) => {
        const info = entityInfoMap.get(item.entityId) || { name: "Unknown" };

        return {
            id: item.entityId,
            name: info.name,
            type: entityType,
            member_count: item.count,
            change_1d: item.change_1d,
            change_7d: item.change_7d,
            change_14d: item.change_14d,
            change_30d: item.change_30d,
            pirate_members: item.pirate_members,
            carebear_members: item.carebear_members,
            sum_sec_status: item.sum_sec_status,
            avg_sec_status: item.avg_sec_status,
            weighted_score: item.weighted_score,
            date_founded: info.date_founded,
        } as any; // Cast to any to bypass potential type issues with date_founded
    });
}
