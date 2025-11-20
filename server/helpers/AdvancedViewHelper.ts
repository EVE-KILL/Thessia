import type { Prisma } from "@prisma/client";
import prisma from "~/lib/prisma";
import type { ITranslation } from "../interfaces/ITranslation";

export interface IAdvancedViewOutput {
    query: Record<string, any>;
    totalKillmails: number;
    isApproximate?: boolean;
    totalKills: number;
    iskDestroyed: number;
    shipGroupStats: Array<{
        ship_group_id: number;
        ship_group_name: string | ITranslation;
        killed: number;
    }>;
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
    topKillersByCorporation: Array<{
        corporation_id: number;
        corporation_name: string;
        kills: number;
    }>;
    topKillersByAlliance: Array<{
        alliance_id: number;
        alliance_name: string;
        kills: number;
    }>;
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

function mapFilterToWhere(
    filter: any,
    depth: number = 0
): Prisma.KillmailWhereInput {
    if (!filter || typeof filter !== "object" || depth > 5) {
        return {};
    }

    const where: Prisma.KillmailWhereInput = {};

    if (Array.isArray(filter.$and)) {
        where.AND = filter.$and.map((f: any) => mapFilterToWhere(f, depth + 1));
    }

    if (Array.isArray(filter.$or)) {
        where.OR = filter.$or.map((f: any) => mapFilterToWhere(f, depth + 1));
    }

    for (const [key, value] of Object.entries(filter)) {
        if (key.startsWith("$")) continue;
        switch (key) {
            case "kill_time":
                if (value && typeof value === "object") {
                    where.killmail_time = {
                        gte: value.$gte ? new Date(value.$gte) : undefined,
                        lte: value.$lte ? new Date(value.$lte) : undefined,
                    };
                }
                break;
            case "system_id":
                where.solar_system_id = Number(value);
                break;
            case "region_id":
                where.region_id = Number(value);
                break;
            case "constellation_id":
                where.constellation_id = Number(value);
                break;
            case "war_id":
                where.war_id = Number(value);
                break;
            case "total_value":
                if (value && typeof value === "object") {
                    where.total_value = {
                        gte:
                            value.$gte !== undefined
                                ? Number(value.$gte)
                                : undefined,
                        lte:
                            value.$lte !== undefined
                                ? Number(value.$lte)
                                : undefined,
                    } as any;
                }
                break;
            case "victim.character_id":
                where.victim = { character_id: Number(value) };
                break;
            case "victim.corporation_id":
                where.victim = { corporation_id: Number(value) };
                break;
            case "victim.alliance_id":
                where.victim = { alliance_id: Number(value) };
                break;
            case "victim.ship_id":
                where.victim = { ship_type_id: Number(value) };
                break;
            case "attackers.character_id":
                where.attackers = { some: { character_id: Number(value) } };
                break;
            case "attackers.corporation_id":
                where.attackers = { some: { corporation_id: Number(value) } };
                break;
            case "attackers.alliance_id":
                where.attackers = { some: { alliance_id: Number(value) } };
                break;
            default:
                break;
        }
    }

    return where;
}

async function hydrateNames<T extends number>(
    ids: T[],
    entity: "character" | "corporation" | "alliance"
): Promise<Map<number, string>> {
    if (ids.length === 0) return new Map();

    if (entity === "character") {
        const rows = await prisma.character.findMany({
            where: { character_id: { in: ids } },
            select: { character_id: true, name: true },
        });
        return new Map(rows.map((r) => [r.character_id, r.name || ""]));
    }

    if (entity === "corporation") {
        const rows = await prisma.corporation.findMany({
            where: { corporation_id: { in: ids } },
            select: { corporation_id: true, name: true },
        });
        return new Map(rows.map((r) => [r.corporation_id, r.name || ""]));
    }

    const rows = await prisma.alliance.findMany({
        where: { alliance_id: { in: ids } },
        select: { alliance_id: true, name: true },
    });
    return new Map(rows.map((r) => [r.alliance_id, r.name || ""]));
}

export default async function generateAdvancedViewStats(
    query: Record<string, any>,
    _facets: string[] = []
): Promise<IAdvancedViewOutput> {
    const where = mapFilterToWhere(query);

    const [totalKillmails, iskAggregate, mostValuable] = await Promise.all([
        prisma.killmail.count({ where }),
        prisma.killmail.aggregate({
            where,
            _sum: { total_value: true },
        }),
        prisma.killmail.findMany({
            where,
            orderBy: { total_value: "desc" },
            include: {
                victim: {
                    include: {
                        ship_type: { select: { name: true } },
                        character: { select: { name: true } },
                        corporation: { select: { name: true } },
                        alliance: { select: { name: true } },
                    },
                },
                attackers: {
                    where: { final_blow: true },
                    include: {
                        ship_type: { select: { name: true } },
                        character: { select: { name: true } },
                    },
                },
            },
            take: 5,
        }),
    ]);

    // Ship group stats (victim ship groups)
    const shipGroups = await prisma.killmailVictim.groupBy({
        by: ["ship_group_id"],
        where: {
            ship_group_id: { not: null },
            killmail: where,
        },
        _count: { _all: true },
        orderBy: { _count: { _all: "desc" } },
        take: 10,
    });
    const shipGroupIds = shipGroups
        .map((g) => g.ship_group_id)
        .filter((id): id is number => id !== null);
    const groupNames =
        shipGroupIds.length > 0
            ? await prisma.invGroup.findMany({
                  where: { group_id: { in: shipGroupIds } },
                  select: { group_id: true, group_name: true },
              })
            : [];
    const groupNameMap = new Map(
        groupNames.map((g) => [g.group_id, g.group_name || ""])
    );

    // Top killers (attackers) by character/corp/alliance
    const attackerBy = async (
        field: "character_id" | "corporation_id" | "alliance_id"
    ) => {
        const rows = await prisma.killmailAttacker.groupBy({
            by: [field],
            where: {
                killmail: where,
                [field]: { not: null },
            },
            _count: { _all: true },
            orderBy: { _count: { _all: "desc" } },
            take: 10,
        });
        const ids = rows
            .map((r) => r[field])
            .filter((id): id is number => id !== null);
        const nameMap = await hydrateNames(
            ids,
            field === "character_id"
                ? "character"
                : field === "corporation_id"
                ? "corporation"
                : "alliance"
        );
        return rows
            .filter((r) => r[field] !== null)
            .map((r) => ({
                [`${field.replace("_id", "")}_id`]: r[field] as number,
                [`${field.replace("_id", "")}_name`]:
                    nameMap.get(r[field] as number) || "",
                kills: r._count._all,
            }));
    };

    const topKillersByCharacter = await attackerBy("character_id");
    const topKillersByCorporation = await attackerBy("corporation_id");
    const topKillersByAlliance = await attackerBy("alliance_id");

    // Top victims by character
    const victimGroups = await prisma.killmailVictim.groupBy({
        by: ["character_id"],
        where: { killmail: where, character_id: { not: null } },
        _count: { _all: true },
        orderBy: { _count: { _all: "desc" } },
        take: 10,
    });
    const victimIds = victimGroups
        .map((v) => v.character_id)
        .filter((id): id is number => id !== null);
    const victimNameMap = await hydrateNames(victimIds, "character");
    const topVictimsByCharacter = victimGroups
        .filter((v) => v.character_id !== null)
        .map((v) => ({
            character_id: v.character_id as number,
            character_name: victimNameMap.get(v.character_id as number) || "",
            losses: v._count._all,
        }));

    // Top damage dealers (attackers)
    const damageGroup = await prisma.killmailAttacker.groupBy({
        by: ["character_id"],
        where: { killmail: where, character_id: { not: null } },
        _sum: { damage_done: true },
        orderBy: { _sum: { damage_done: "desc" } },
        take: 10,
    });
    const dmgIds = damageGroup
        .map((d) => d.character_id)
        .filter((id): id is number => id !== null);
    const dmgNameMap = await hydrateNames(dmgIds, "character");
    const topDamageDealersByCharacter = damageGroup
        .filter((d) => d.character_id !== null)
        .map((d) => ({
            character_id: d.character_id as number,
            character_name: dmgNameMap.get(d.character_id as number) || "",
            damageDone: Number(d._sum.damage_done || 0),
        }));

    const mostValuableKills =
        mostValuable?.map((km) => {
            const finalBlow = km.attackers?.[0];
            return {
                killmail_id: km.killmail_id,
                total_value: km.total_value ? Number(km.total_value) : 0,
                victim: {
                    ship_id: km.victim?.ship_type_id || 0,
                    ship_name: km.victim?.ship_type?.name || {},
                    character_id: km.victim?.character_id || undefined,
                    character_name: km.victim?.character?.name || undefined,
                    corporation_id: km.victim?.corporation_id || undefined,
                    corporation_name: km.victim?.corporation?.name || undefined,
                    alliance_id: km.victim?.alliance_id || undefined,
                    alliance_name: km.victim?.alliance?.name || undefined,
                },
                final_blow: finalBlow
                    ? {
                          character_id: finalBlow.character_id || undefined,
                          character_name: finalBlow.character?.name || undefined,
                          ship_id: finalBlow.ship_type_id || 0,
                          ship_name: finalBlow.ship_type?.name || {},
                      }
                    : undefined,
            };
        }) || [];

    return {
        query,
        totalKillmails,
        totalKills: totalKillmails,
        iskDestroyed: iskAggregate._sum.total_value
            ? Number(iskAggregate._sum.total_value)
            : 0,
        shipGroupStats: shipGroups.map((g) => ({
            ship_group_id: g.ship_group_id as number,
            ship_group_name: groupNameMap.get(g.ship_group_id as number) || "",
            killed: g._count._all,
        })),
        topKillersByCharacter: topKillersByCharacter as any,
        topVictimsByCharacter,
        topDamageDealersByCharacter,
        topKillersByCorporation: topKillersByCorporation as any,
        topKillersByAlliance: topKillersByAlliance as any,
        mostValuableKills,
    };
}
