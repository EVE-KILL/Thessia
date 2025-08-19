import { Alliances } from "../../models/Alliances";
import { Corporations } from "../../models/Corporations";
import { Wars } from "../../models/Wars";

export default defineCachedEventHandler(
    async (event) => {
        try {
            // Date limit for recently finished wars (last 7 days)
            const sevenDaysAgo = new Date();
            sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

            // Load wars sequentially to avoid memory issues
            // Wars open to allies (active, not finished) - limit to 100 most recent
            const recentOpenToAllies = await Wars.find({
                open_for_allies: true,
                mutual: false,
                finished: { $exists: false },
            })
                .sort({ declared: -1 })
                .limit(100)
                .lean();

            // Mutual wars (active, not finished) - limit to 100 most recent
            const recentMutual = await Wars.find({
                mutual: true,
                finished: { $exists: false },
            })
                .sort({ declared: -1 })
                .limit(100)
                .lean();

            // Other active wars (not open to allies, not mutual, not finished) - limit to 100 most recent
            const recentOther = await Wars.find({
                open_for_allies: false,
                mutual: false,
                finished: { $exists: false },
            })
                .sort({ declared: -1 })
                .limit(100)
                .lean();

            // Recently finished wars (finished within last 7 days only) - limit to 50
            const recentFinished = await Wars.find({
                finished: {
                    $exists: true,
                    $gte: sevenDaysAgo,
                },
            })
                .sort({ finished: -1 })
                .limit(50)
                .lean();

            // Collect corporation and alliance IDs more efficiently
            const allWars = [
                ...recentOpenToAllies,
                ...recentMutual,
                ...recentOther,
                ...recentFinished,
            ];
            const corporationIds = new Set<number>();
            const allianceIds = new Set<number>();

            // Process in smaller batches to avoid memory spikes
            for (const war of allWars) {
                if (war.aggressor.corporation_id)
                    corporationIds.add(war.aggressor.corporation_id);
                if (war.aggressor.alliance_id)
                    allianceIds.add(war.aggressor.alliance_id);
                if (war.defender.corporation_id)
                    corporationIds.add(war.defender.corporation_id);
                if (war.defender.alliance_id)
                    allianceIds.add(war.defender.alliance_id);

                // Only process allies if they exist (avoid unnecessary iterations)
                if (war.allies && war.allies.length > 0) {
                    for (const ally of war.allies) {
                        if (ally.corporation_id)
                            corporationIds.add(ally.corporation_id);
                        if (ally.alliance_id) allianceIds.add(ally.alliance_id);
                    }
                }
            }

            // Fetch entity data sequentially to reduce memory pressure
            const corporations =
                corporationIds.size > 0
                    ? await Corporations.find(
                          {
                              corporation_id: {
                                  $in: Array.from(corporationIds),
                              },
                          },
                          { corporation_id: 1, name: 1 }
                      ).lean()
                    : [];

            const alliances =
                allianceIds.size > 0
                    ? await Alliances.find(
                          { alliance_id: { $in: Array.from(allianceIds) } },
                          { alliance_id: 1, name: 1 }
                      ).lean()
                    : [];

            // Create lookup maps for faster access
            const corpMap = new Map(
                corporations.map((corp) => [corp.corporation_id, corp])
            );
            const allianceMap = new Map(
                alliances.map((alliance) => [alliance.alliance_id, alliance])
            );

            // Memory-efficient population function - process one war at a time
            const populateWar = (war: any) => {
                const populatedWar = {
                    ...war,
                    aggressor: {
                        ...war.aggressor,
                        corporation: war.aggressor.corporation_id
                            ? corpMap.get(war.aggressor.corporation_id) || null
                            : null,
                        alliance: war.aggressor.alliance_id
                            ? allianceMap.get(war.aggressor.alliance_id) || null
                            : null,
                    },
                    defender: {
                        ...war.defender,
                        corporation: war.defender.corporation_id
                            ? corpMap.get(war.defender.corporation_id) || null
                            : null,
                        alliance: war.defender.alliance_id
                            ? allianceMap.get(war.defender.alliance_id) || null
                            : null,
                    },
                };

                // Only populate allies if they exist
                if (war.allies && war.allies.length > 0) {
                    populatedWar.allies = war.allies.map((ally: any) => ({
                        ...ally,
                        corporation: ally.corporation_id
                            ? corpMap.get(ally.corporation_id) || null
                            : null,
                        alliance: ally.alliance_id
                            ? allianceMap.get(ally.alliance_id) || null
                            : null,
                    }));
                } else {
                    populatedWar.allies = [];
                }

                return populatedWar;
            };

            // Populate wars one category at a time to control memory usage
            return {
                recentOpenToAllies: recentOpenToAllies.map(populateWar),
                recentMutual: recentMutual.map(populateWar),
                recentOther: recentOther.map(populateWar),
                recentFinished: recentFinished.map(populateWar),
            };
        } catch (error) {
            console.error("Wars recent API error:", error);
            throw createError({
                statusCode: 500,
                statusMessage: "Failed to fetch recent wars",
            });
        }
    },
    {
        maxAge: 60 * 2, // 2 minutes cache (reduced from 5 for better freshness)
        getKey: () => "wars-recent",
    }
);
