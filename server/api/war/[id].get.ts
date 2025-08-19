import type { IWar } from "../../interfaces/IWar";
import { Alliances } from "../../models/Alliances";
import { Corporations } from "../../models/Corporations";
import { Killmails } from "../../models/Killmails";
import { Wars } from "../../models/Wars";

export default defineCachedEventHandler(
    async (event) => {
        const warId = Number(event.context.params?.id);

        if (!warId || isNaN(warId)) {
            throw createError({
                statusCode: 400,
                statusMessage: "Invalid war ID",
            });
        }

        try {
            // Fetch the war data
            const warDoc = await Wars.findOne({ war_id: warId }).lean();

            if (!warDoc) {
                throw createError({
                    statusCode: 404,
                    statusMessage: "War not found",
                });
            }

            // Cast to proper type
            const war = warDoc as unknown as IWar;

            // Collect all entity IDs for population
            const corporationIds = new Set<number>();
            const allianceIds = new Set<number>();
            const characterIds = new Set<number>();

            // Add aggressor and defender IDs
            if (war.aggressor.corporation_id)
                corporationIds.add(war.aggressor.corporation_id);
            if (war.aggressor.alliance_id)
                allianceIds.add(war.aggressor.alliance_id);
            if (war.defender.corporation_id)
                corporationIds.add(war.defender.corporation_id);
            if (war.defender.alliance_id)
                allianceIds.add(war.defender.alliance_id);

            // Add allies IDs
            war.allies?.forEach((ally) => {
                if (ally.corporation_id)
                    corporationIds.add(ally.corporation_id);
                if (ally.alliance_id) allianceIds.add(ally.alliance_id);
            });

            // Fetch entity data in parallel
            const [corporations, alliances] = await Promise.all([
                Corporations.find(
                    { corporation_id: { $in: Array.from(corporationIds) } },
                    { corporation_id: 1, name: 1 }
                ).lean(),
                Alliances.find(
                    { alliance_id: { $in: Array.from(allianceIds) } },
                    { alliance_id: 1, name: 1 }
                ).lean(),
            ]);

            // Create lookup maps
            const corpMap = new Map(
                corporations.map((corp) => [corp.corporation_id, corp])
            );
            const allianceMap = new Map(
                alliances.map((alliance) => [alliance.alliance_id, alliance])
            );

            // Populate war with entity names
            const populatedWar = {
                ...war,
                aggressor: {
                    ...war.aggressor,
                    corporation: war.aggressor.corporation_id
                        ? corpMap.get(war.aggressor.corporation_id)
                        : null,
                    alliance: war.aggressor.alliance_id
                        ? allianceMap.get(war.aggressor.alliance_id)
                        : null,
                },
                defender: {
                    ...war.defender,
                    corporation: war.defender.corporation_id
                        ? corpMap.get(war.defender.corporation_id)
                        : null,
                    alliance: war.defender.alliance_id
                        ? allianceMap.get(war.defender.alliance_id)
                        : null,
                },
                allies:
                    war.allies?.map((ally) => ({
                        ...ally,
                        corporation: ally.corporation_id
                            ? corpMap.get(ally.corporation_id)
                            : null,
                        alliance: ally.alliance_id
                            ? allianceMap.get(ally.alliance_id)
                            : null,
                    })) || [],
            };

            // Build query for killmails in this war
            const warFilter = {
                war_id: warId,
            };

            // Fetch war statistics
            const [totalStats, topKillers, mostValuableKills, shipTypeStats] =
                await Promise.all([
                    // Basic stats aggregation
                    Killmails.aggregate([
                        { $match: warFilter },
                        {
                            $group: {
                                _id: null,
                                totalKills: { $sum: 1 },
                                totalValue: { $sum: "$total_value" },
                                uniqueCharacters: {
                                    $addToSet: "$victim.character_id",
                                },
                                uniqueCorporations: {
                                    $addToSet: "$victim.corporation_id",
                                },
                                uniqueAlliances: {
                                    $addToSet: "$victim.alliance_id",
                                },
                            },
                        },
                    ]),

                    // Top killers (based on final_blow)
                    Killmails.aggregate([
                        { $match: warFilter },
                        { $unwind: "$attackers" },
                        { $match: { "attackers.final_blow": true } },
                        {
                            $group: {
                                _id: "$attackers.character_id",
                                character_name: {
                                    $first: "$attackers.character_name",
                                },
                                kills: { $sum: 1 },
                            },
                        },
                        { $sort: { kills: -1 } },
                        { $limit: 20 },
                    ]),

                    // Most valuable kills
                    Killmails.aggregate([
                        { $match: warFilter },
                        {
                            $project: {
                                killmail_id: 1,
                                total_value: 1,
                                ship_id: "$victim.ship_id",
                                ship_name: "$victim.ship_name",
                                character_id: "$victim.character_id",
                                character_name: "$victim.character_name",
                            },
                        },
                        { $sort: { total_value: -1 } },
                        { $limit: 10 },
                    ]),

                    // Ship type breakdown
                    Killmails.aggregate([
                        { $match: warFilter },
                        {
                            $group: {
                                _id: "$victim.ship_group_id",
                                group_name: {
                                    $first: "$victim.ship_group_name",
                                },
                                count: { $sum: 1 },
                            },
                        },
                        { $sort: { count: -1 } },
                        { $limit: 15 },
                    ]),
                ]);

            // Process statistics
            const stats = totalStats[0] || {
                totalKills: 0,
                totalValue: 0,
                uniqueCharacters: [],
                uniqueCorporations: [],
                uniqueAlliances: [],
            };

            const warStatistics = {
                totalKills: stats.totalKills,
                totalValue: stats.totalValue,
                uniqueParticipants: new Set([
                    ...stats.uniqueCharacters.filter((id: any) => id),
                    ...stats.uniqueCorporations.filter((id: any) => id),
                    ...stats.uniqueAlliances.filter((id: any) => id),
                ]).size,
                topKillers: topKillers.map((killer) => ({
                    character_id: killer._id,
                    character_name: killer.character_name || "Unknown",
                    kills: killer.kills,
                })),
                mostValuable: mostValuableKills.map((kill) => ({
                    killmail_id: kill.killmail_id,
                    total_value: kill.total_value,
                    ship_id: kill.ship_id,
                    ship_name: kill.ship_name || "Unknown Ship",
                    character_id: kill.character_id,
                    character_name: kill.character_name || "Unknown",
                })),
                shipTypes: shipTypeStats.map((shipType) => ({
                    group_id: shipType._id,
                    group_name: shipType.group_name || "Unknown",
                    count: shipType.count,
                })),
            };

            return {
                war: populatedWar,
                stats: warStatistics,
            };
        } catch (error) {
            console.error("War API error:", error);
            throw createError({
                statusCode: 500,
                statusMessage: "Failed to fetch war data",
            });
        }
    },
    {
        maxAge: 60 * 5, // 5 minutes cache
        getKey: (event) => {
            const warId = event.context.params?.id;
            return `war-${warId}`;
        },
    }
);
