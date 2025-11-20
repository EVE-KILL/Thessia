import prisma from "~/lib/prisma";
import { KillmailService } from "~/server/services";

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

async function getBattleData(killmailId: number) {
    return await prisma.battle.findFirst({
        where: {
            killmail_ids: {
                array_contains: killmailId,
            },
        },
    });
}

export default defineCachedEventHandler(
    async (event) => {
        const killmail_id = event.context.params?.id;
        // Default to true to ensure data is available for all tabs
        const includeKillmails =
            event.context.query?.includeKillmails !== "false";

        if (!killmail_id) {
            throw createError({
                statusCode: 400,
                statusMessage: "Killmail ID is required",
            });
        }

        const killmailId = parseInt(killmail_id as string, 10);
        const rawBattleData = await getBattleData(killmailId);

        if (!rawBattleData) {
            return null;
        }

        // Process the battle data using the helper function
        const processedBattle = await processBattleDataForFrontend(
            rawBattleData,
            includeKillmails
        );

        return processedBattle;
    },
    {
        maxAge: 300,
        staleMaxAge: -1,
        swr: true,
        base: "redis",
        getKey: (event) => {
            const idParam = event.context.params?.id;
            const includeKillmails =
                event.context.query?.includeKillmails !== "false";
            return `battles:killmail:${idParam}:${
                includeKillmails ? "with-killmails" : "index"
            }`;
        },
    }
);
