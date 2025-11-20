import { BattleService, KillmailService } from "~/server/services";

async function processBattleDataForFrontend(
    battle: any,
    includeKillmails: boolean
) {
    const killmailIds: number[] = Array.isArray(battle.killmail_ids)
        ? battle.killmail_ids
        : [];

    const killmails = includeKillmails && killmailIds.length
        ? await KillmailService.findByIds(killmailIds)
        : [];

    return {
        battle_id: Number(battle.battle_id),
        custom: battle.custom,
        start_time: battle.start_time,
        end_time: battle.end_time,
        duration_ms: battle.duration_ms ? Number(battle.duration_ms) : null,
        killmails_count: battle.killmails_count,
        isk_destroyed: battle.isk_destroyed
            ? Number(battle.isk_destroyed)
            : 0,
        systems: (battle.systems as any) || [],
        sides: (battle.sides as any) || {},
        killmail_ids: killmailIds,
        killmails: includeKillmails ? killmails : undefined,
    };
}

export default defineCachedEventHandler(
    async (event) => {
        const idParam = event.context.params?.id;
        // Default to true to ensure data is available for all tabs
        const includeKillmails =
            event.context.query?.includeKillmails !== "false";

        if (!idParam) {
            throw createError({
                statusCode: 400,
                statusMessage: "Battle ID parameter is missing",
            });
        }

        const battleId = parseInt(idParam, 10);

        if (isNaN(battleId)) {
            throw createError({
                statusCode: 400,
                statusMessage: "Invalid Battle ID format",
            });
        }

        try {
            // Get battle data using BattleService
            const rawBattle = await BattleService.findById(battleId);

            if (!rawBattle) {
                throw createError({
                    statusCode: 404,
                    statusMessage: "battle not found",
                });
            }

            // Convert Prisma battle data to format expected by processBattleDataForFrontend
            // For now, we'll create a minimal adapter to work with the existing helper
            const battleDocument = {
                battle_id: Number(rawBattle.battle_id),
                custom: rawBattle.custom,
                start_time: rawBattle.start_time,
                end_time: rawBattle.end_time,
                duration_ms: rawBattle.duration_ms
                    ? Number(rawBattle.duration_ms)
                    : undefined,

                // Map Prisma field names to expected interface
                killmailsCount: rawBattle.killmails_count,
                iskDestroyed: Number(rawBattle.isk_destroyed),

                // Extract from JSON fields or provide empty arrays as fallback
                systems: (rawBattle.systems as any) || [],
                sides: (rawBattle.sides as any) || {},
                killmail_ids: (rawBattle.killmail_ids as any) || [],
                side_ids: Object.keys((rawBattle.sides as any) || {}),

                // These would need to be calculated from the sides JSON if needed
                alliancesInvolved: [],
                corporationsInvolved: [],
                charactersInvolved: [],
                involved_alliances_count: 0,
                involved_corporations_count: 0,
                involved_characters_count: 0,

                // These would be in the JSON structure
                top_alliances: [],
                top_corporations: [],
                top_ship_types: [],
            } as any;

            // Process the battle data using the helper function
            const processedBattle = await processBattleDataForFrontend(
                battleDocument,
                includeKillmails
            );

            return processedBattle;
        } catch (error: any) {
            if (error.name === "CastError") {
                throw createError({
                    statusCode: 400,
                    statusMessage: "Invalid Battle ID format",
                });
            }
            if (error.statusCode === 404) {
                throw error;
            }
            console.error(`Error fetching battle with ID ${battleId}:`, error);
            throw createError({
                statusCode: 500,
                statusMessage: "Internal Server Error fetching battle",
            });
        }
    },
    {
        maxAge: 300,
        staleMaxAge: -1,
        swr: true,
        base: "redis",
        getKey: (event) => {
            const battleId = event.context.params?.id;
            const includeKillmails =
                event.context.query?.includeKillmails !== "false";
            if (!battleId) {
                throw createError({
                    statusCode: 500,
                    statusMessage: "Battle ID not found in context",
                });
            }
            return `battles:${battleId}:${
                includeKillmails ? "with-killmails" : "index"
            }`;
        },
    }
);
