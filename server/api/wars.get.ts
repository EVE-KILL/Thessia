import { Alliances } from "../models/Alliances";
import { Corporations } from "../models/Corporations";
import { Wars } from "../models/Wars";

export default defineCachedEventHandler(
    async (event) => {
        const query = getQuery(event);
        const page = Number(query.page) || 1;
        const limit = Math.min(Number(query.limit) || 25, 100);
        const skip = (page - 1) * limit;
        const entityId = Number(query.entityId) || null;
        const entityType = query.entityType as string;
        const tab = (query.tab as string) || "all";

        // Extract filter parameters
        const ongoing = query.ongoing === "true";
        const mutual = query.mutual === "true";
        const openToAllies = query.openToAllies === "true";
        const hasActivity = query.hasActivity === "true";

        try {
            let filterQuery: any = {};
            let sortQuery: any = { started: -1 }; // Default sort by started date descending

            // Handle entity-based filtering
            if (entityId && entityType) {
                if (entityType === "corporation") {
                    filterQuery = {
                        $or: [
                            { "aggressor.corporation_id": entityId },
                            { "defender.corporation_id": entityId },
                            { "allies.corporation_id": entityId },
                        ],
                    };
                } else if (entityType === "alliance") {
                    filterQuery = {
                        $or: [
                            { "aggressor.alliance_id": entityId },
                            { "defender.alliance_id": entityId },
                            { "allies.alliance_id": entityId },
                        ],
                    };
                }
            }

            // Handle tab-specific filtering
            switch (tab) {
                case "recent":
                    // Recent activity - last 30 days
                    const thirtyDaysAgo = new Date();
                    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

                    filterQuery = {
                        ...filterQuery,
                        $or: [
                            { started: { $gte: thirtyDaysAgo } },
                            { finished: { $gte: thirtyDaysAgo } },
                        ],
                    };
                    break;
                case "all":
                default:
                    // All wars, default sorting
                    break;
            }

            // Apply additional filters
            if (ongoing) {
                filterQuery.finished = null; // Only wars that haven't finished
            }

            if (mutual) {
                filterQuery.mutual = true;
            }

            if (openToAllies) {
                filterQuery.open_for_allies = true;
            }

            if (hasActivity) {
                filterQuery.$or = [
                    ...(filterQuery.$or || []),
                    { "aggressor.ships_killed": { $gt: 0 } },
                    { "defender.ships_killed": { $gt: 0 } },
                ];
            }

            // Get wars with pagination
            const [wars, totalCount] = await Promise.all([
                Wars.find(filterQuery)
                    .sort(sortQuery)
                    .skip(skip)
                    .limit(limit)
                    .lean(),
                Wars.countDocuments(filterQuery),
            ]);

            // Collect all corporation and alliance IDs for population
            const corporationIds = new Set<number>();
            const allianceIds = new Set<number>();

            wars.forEach((war) => {
                if (war.aggressor.corporation_id)
                    corporationIds.add(war.aggressor.corporation_id);
                if (war.aggressor.alliance_id)
                    allianceIds.add(war.aggressor.alliance_id);
                if (war.defender.corporation_id)
                    corporationIds.add(war.defender.corporation_id);
                if (war.defender.alliance_id)
                    allianceIds.add(war.defender.alliance_id);

                war.allies?.forEach((ally) => {
                    if (ally.corporation_id)
                        corporationIds.add(ally.corporation_id);
                    if (ally.alliance_id) allianceIds.add(ally.alliance_id);
                });
            });

            // Fetch corporation and alliance data
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

            // Populate wars with entity names
            const populatedWars = wars.map((war) => ({
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
            }));

            return {
                wars: populatedWars,
                totalItems: totalCount,
                totalPages: Math.ceil(totalCount / limit),
                currentPage: page,
                itemsPerPage: limit,
            };
        } catch (error) {
            console.error("Wars API error:", error);
            throw createError({
                statusCode: 500,
                statusMessage: "Failed to fetch wars",
            });
        }
    },
    {
        maxAge: 60 * 5, // 5 minutes cache
        getKey: (event) => {
            const query = getQuery(event);
            return `wars-${JSON.stringify(query)}`;
        },
    }
);
