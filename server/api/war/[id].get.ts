import { KillmailService, WarService } from "../../services";

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
            const war = await WarService.findById(warId);

            if (!war) {
                throw createError({
                    statusCode: 404,
                    statusMessage: "War not found",
                });
            }

            // Extract entity IDs and populate the war
            const { corporationIds, allianceIds } = WarService.extractEntityIds(
                [war]
            );
            const [populatedWar] = await WarService.populateWarEntities(
                [war],
                corporationIds,
                allianceIds
            );

            // Get war statistics using the service
            const warStats = await KillmailService.getWarStats(warId);

            const warStatistics = {
                totalKills: warStats.totalKills,
                totalValue: warStats.totalValue,
                uniqueParticipants:
                    warStats.uniqueCharacters +
                    warStats.uniqueCorporations +
                    warStats.uniqueAlliances,
                topKillers: warStats.topKillers.map((killer) => ({
                    character_id: killer.character_id,
                    character_name: killer.character_name || "Unknown",
                    kills: killer.kills,
                })),
                mostValuable: warStats.mostValuableKills.map((kill) => ({
                    killmail_id: kill.killmail_id,
                    total_value: kill.total_value,
                    ship_id: kill.ship_id,
                    ship_name: kill.ship_name || "Unknown Ship",
                    character_id: kill.character_id,
                    character_name: kill.character_name || "Unknown",
                })),
                shipTypes: warStats.shipTypeStats.map((shipType) => ({
                    group_id: shipType.ship_group_id,
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
