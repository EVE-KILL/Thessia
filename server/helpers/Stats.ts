import prisma from "~/lib/prisma";
import type { IKillmail } from "../interfaces/IKillmail";

export type StatsType = "character_id" | "corporation_id" | "alliance_id";

type EntityFilter = {
    attackers?: { some: Record<string, number> };
    victim?: Record<string, number>;
};

function buildFilters(
    entityType: StatsType,
    entityId: number
): { attackerFilter: EntityFilter; victimFilter: EntityFilter } {
    if (entityType === "character_id") {
        return {
            attackerFilter: { attackers: { some: { character_id: entityId } } },
            victimFilter: { victim: { character_id: entityId } },
        };
    }
    if (entityType === "corporation_id") {
        return {
            attackerFilter: {
                attackers: { some: { corporation_id: entityId } },
            },
            victimFilter: { victim: { corporation_id: entityId } },
        };
    }
    return {
        attackerFilter: { attackers: { some: { alliance_id: entityId } } },
        victimFilter: { victim: { alliance_id: entityId } },
    };
}

async function aggregateStats(entityType: StatsType, entityId: number) {
    const { attackerFilter, victimFilter } = buildFilters(entityType, entityId);

    const [killsAgg, lossesAgg] = await Promise.all([
        prisma.killmail.aggregate({
            where: attackerFilter,
            _count: { _all: true },
            _sum: { total_value: true },
            _max: { killmail_time: true },
        }),
        prisma.killmail.aggregate({
            where: victimFilter,
            _count: { _all: true },
            _sum: { total_value: true },
            _max: { killmail_time: true },
        }),
    ]);

    const [soloKills, soloLosses] = await Promise.all([
        prisma.killmail.count({
            where: { ...attackerFilter, is_solo: true },
        }),
        prisma.killmail.count({
            where: { ...victimFilter, is_solo: true },
        }),
    ]);

    const kills = killsAgg._count._all;
    const losses = lossesAgg._count._all;
    const totalIskDestroyed = Number(killsAgg._sum.total_value || 0);
    const totalIskLost = Number(lossesAgg._sum.total_value || 0);
    const lastKillDate = killsAgg._max.killmail_time || null;
    const lastLossDate = lossesAgg._max.killmail_time || null;
    const efficiency =
        kills + losses > 0 ? (kills / (kills + losses)) * 100 : null;

    return {
        kills,
        losses,
        total_damage_done: null,
        total_damage_received: null,
        total_isk_destroyed: totalIskDestroyed,
        total_isk_lost: totalIskLost,
        last_kill_date: lastKillDate,
        last_loss_date: lastLossDate,
        efficiency,
        avg_gang_size: null,
        solo_kills: soloKills,
        solo_losses: soloLosses,
        solo_percentage:
            soloKills + soloLosses > 0
                ? (soloKills / (soloKills + soloLosses)) * 100
                : null,
        ships_used: null,
        ships_lost: null,
        most_used_ship: null,
        most_lost_ship: null,
        top_victims: null,
        top_attackers: null,
        monthly_stats: null,
        weekly_stats: null,
        daily_stats: null,
        recent_activity: null,
        full_stats: null,
    };
}

async function saveStats(
    entityType: StatsType,
    entityId: number,
    stats: Awaited<ReturnType<typeof aggregateStats>>
) {
    const existing = await prisma.stats.findFirst({
        where: { entity_type: entityType, entity_id: entityId },
        select: { id: true },
    });

    if (existing?.id) {
        await prisma.stats.update({
            where: { id: existing.id },
            data: stats,
        });
    } else {
        await prisma.stats.create({
            data: {
                entity_type: entityType,
                entity_id: entityId,
                ...stats,
            },
        });
    }
}

export async function updateStatsOnKillmailProcessing(
    killmail: IKillmail
): Promise<void> {
    const entityMap = new Map<StatsType, Set<number>>([
        ["character_id", new Set<number>()],
        ["corporation_id", new Set<number>()],
        ["alliance_id", new Set<number>()],
    ]);

    const victim = killmail.victim;
    if (victim.character_id) {
        entityMap.get("character_id")!.add(victim.character_id);
    }
    if (victim.corporation_id) {
        entityMap.get("corporation_id")!.add(victim.corporation_id);
    }
    if (victim.alliance_id) {
        entityMap.get("alliance_id")!.add(victim.alliance_id);
    }

    for (const attacker of killmail.attackers) {
        if (attacker.character_id) {
            entityMap.get("character_id")!.add(attacker.character_id);
        }
        if (attacker.corporation_id) {
            entityMap.get("corporation_id")!.add(attacker.corporation_id);
        }
        if (attacker.alliance_id) {
            entityMap.get("alliance_id")!.add(attacker.alliance_id);
        }
    }

    for (const [type, ids] of entityMap.entries()) {
        for (const id of ids) {
            const stats = await aggregateStats(type, id);
            await saveStats(type, id, stats);
        }
    }
}

export async function calculateAllStats(
    type: StatsType,
    id: number,
    _days?: number
): Promise<any> {
    const stats = await aggregateStats(type, id);
    await saveStats(type, id, stats);
    return stats;
}

// Backwards compatibility helper for callers that expect a placeholder
export async function createPlaceholderStats(
    type: StatsType,
    id: number
): Promise<any> {
    return await aggregateStats(type, id);
}
