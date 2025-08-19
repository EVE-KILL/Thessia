export default defineCachedEventHandler(
    async (event) => {
        const params = getRouterParams(event);
        const query = getQuery(event);

        const type = params.type as StatsType;
        const id = Number.parseInt(params.id as string);
        const days = query.days ? Number.parseInt(query.days as string) : 7;
        const dataType = (query.dataType as string) || "all";

        // Validate parameters
        if (
            !type ||
            !["character_id", "corporation_id", "alliance_id"].includes(type)
        ) {
            throw createError({
                statusCode: 400,
                statusMessage:
                    "Invalid type. Must be character_id, corporation_id, or alliance_id",
            });
        }

        if (!id || isNaN(id) || id <= 0) {
            throw createError({
                statusCode: 400,
                statusMessage: "Invalid ID",
            });
        }

        if (days < 0) {
            throw createError({
                statusCode: 400,
                statusMessage: "Days must be 0 or positive (0 = all time)",
            });
        }

        try {
            // Always try to get existing stats from database first
            let stats = await Stats.findOne(
                { type, id, days },
                { _id: 0, __v: 0 }
            ).lean();

            // If no stats exist, create placeholder and queue for processing
            if (!stats) {
                const placeholderStats = await createPlaceholderStats(
                    type,
                    id,
                    days
                );
                const fullStats = {
                    ...placeholderStats,
                    full: {} as any,
                    needsUpdate: true, // Mark for queue processing
                };

                // Save placeholder to database
                await Stats.findOneAndUpdate({ type, id, days }, fullStats, {
                    upsert: true,
                    setDefaultsOnInsert: true,
                });

                // Set stats to the created placeholder for return
                stats = fullStats as any;

                // Queue high-priority job for immediate processing
                await addStatsJob(type, id, days, 1); // Priority 1 = highest priority
            }

            // Return data based on requested type (from existing DB data only)
            switch (dataType) {
                case "ships":
                    return stats?.full?.topShips || [];

                case "systems":
                    return stats?.full?.topSystems || [];

                case "constellations":
                    return stats?.full?.topConstellations || [];

                case "regions":
                    return stats?.full?.topRegions || [];

                case "characters":
                    return stats?.full?.topCharacters || [];

                case "corporations":
                    return stats?.full?.topCorporations || [];

                case "most_valuable_kills":
                    return stats?.full?.mostValuableKills || [];

                case "most_valuable_ships":
                    return stats?.full?.mostValuableShips || [];

                case "most_valuable_structures":
                    return stats?.full?.mostValuableStructures || [];

                case "shipGroupStats":
                    if (!stats?.full?.shipGroupStats) {
                        return { shipGroupStats: [] };
                    }
                    return { shipGroupStats: stats.full.shipGroupStats };

                case "monthlyStats":
                    if (!stats?.full?.monthlyStats) {
                        return { monthlyStats: [] };
                    }
                    return { monthlyStats: stats.full.monthlyStats };

                case "mostUsedShips":
                    return stats?.full?.mostUsedShips || {};

                case "mostLostShips":
                    return stats?.full?.mostLostShips || {};

                case "basic":
                    return {
                        type: stats?.type || type,
                        id: stats?.id || id,
                        days: stats?.days || days,
                        kills: stats?.kills || 0,
                        losses: stats?.losses || 0,
                        iskKilled: stats?.iskKilled || 0,
                        iskLost: stats?.iskLost || 0,
                        npcLosses: stats?.npcLosses || 0,
                        soloKills: stats?.soloKills || 0,
                        soloLosses: stats?.soloLosses || 0,
                        lastActive: stats?.lastActive,
                    };

                case "full":
                    return stats?.full || {};

                default:
                    // Return all stats
                    return (
                        stats || {
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
                            full: {},
                            updatedAt: new Date(),
                            needsUpdate: true,
                        }
                    );
            }
        } catch (error: any) {
            console.error(`Error fetching stats for ${type} ${id}:`, error);
            throw createError({
                statusCode: 500,
                statusMessage: "Failed to fetch stats",
            });
        }
    },
    {
        maxAge: 3600, // 1 hour cache
        staleMaxAge: -1,
        swr: true,
        base: "redis",
        getKey: (event) => {
            const params = getRouterParams(event);
            const query = getQuery(event);
            const type = params.type;
            const id = params.id;
            const days = query.days || "7";
            const dataType = query.dataType || "all";

            return `stats:${type}:${id}:days:${days}:dataType:${dataType}`;
        },
    }
);
