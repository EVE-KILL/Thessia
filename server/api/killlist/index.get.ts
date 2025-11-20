import prisma from "~/lib/prisma";
import { TypeService } from "~/server/services";

type KilllistType =
    | "latest"
    | "abyssal"
    | "wspace"
    | "highsec"
    | "lowsec"
    | "nullsec"
    | "pochven"
    | "big"
    | "solo"
    | "npc"
    | "5b"
    | "10b"
    | "citadels"
    | "t1"
    | "t2"
    | "t3"
    | "faction"
    | "frigates"
    | "destroyers"
    | "cruisers"
    | "battlecruisers"
    | "battleships"
    | "capitals"
    | "freighters"
    | "supercarriers"
    | "titans"
    | "structureboys";

const shipGroupFilters: Record<KilllistType, number[] | undefined> = {
    frigates: [324, 893, 25, 831, 237],
    destroyers: [420, 541],
    cruisers: [906, 26, 833, 358, 894, 832, 963],
    battlecruisers: [419, 540],
    battleships: [27, 898, 900],
    capitals: [547, 485],
    freighters: [513, 902],
    supercarriers: [659],
    titans: [30],
    big: [547, 485, 513, 902, 941, 30, 659],
    citadels: [1657, 1406, 1404, 1408, 2017, 2016],
    structureboys: [1657],
    t1: undefined,
    t2: undefined,
    t3: undefined,
    faction: undefined,
    latest: undefined,
    abyssal: undefined,
    wspace: undefined,
    highsec: undefined,
    lowsec: undefined,
    nullsec: undefined,
    pochven: undefined,
    solo: undefined,
    npc: undefined,
    "5b": undefined,
    "10b": undefined,
};

const formatKillmail = (km: any) => {
    const finalBlow = km.attackers?.find((a: any) => a.final_blow);
    return {
        killmail_id: km.killmail_id,
        total_value: km.total_value ? Number(km.total_value) : 0,
        system_id: km.solar_system_id,
        system_name: km.solar_system?.system_name || "",
        system_security: km.solar_system?.security || 0,
        region_id: km.region_id || km.solar_system?.region_id || null,
        region_name: km.region?.region_name || "",
        kill_time: km.killmail_time,
        attackerCount: km.attackers?.length || 0,
        commentCount: 0,
        is_npc: km.is_npc,
        is_solo: km.is_solo,
        victim: {
            ship_id: km.victim?.ship_type_id || 0,
            ship_name: km.victim?.ship_type?.name || {},
            ship_group_name: km.victim?.ship_group?.group_name || {},
            character_id: km.victim?.character_id || 0,
            character_name: km.victim?.character?.name || "",
            corporation_id: km.victim?.corporation_id || 0,
            corporation_name: km.victim?.corporation?.name || "",
            alliance_id: km.victim?.alliance_id || 0,
            alliance_name: km.victim?.alliance?.name || "",
            faction_id: km.victim?.faction_id || 0,
            faction_name: km.victim?.faction?.name || "",
        },
        finalblow: finalBlow
            ? {
                  character_id: finalBlow.character_id || 0,
                  character_name: finalBlow.character?.name || "",
                  corporation_id: finalBlow.corporation_id || 0,
                  corporation_name: finalBlow.corporation?.name || "",
                  alliance_id: finalBlow.alliance_id || 0,
                  alliance_name: finalBlow.alliance?.name || "",
                  faction_id: finalBlow.faction_id || 0,
                  faction_name: finalBlow.faction?.name || "",
                  ship_group_name: finalBlow.ship_group?.group_name || {},
              }
            : null,
    };
};

async function buildWhere(type: KilllistType) {
    const where: any = {};

    switch (type) {
        case "latest":
            break;
        case "abyssal":
            where.region_id = { gte: 12000000, lte: 13000000 };
            break;
        case "wspace":
            where.region_id = { gte: 11000001, lte: 11000033 };
            break;
        case "highsec":
            where.solar_system = { security: { gte: 0.45 } };
            break;
        case "lowsec":
            where.solar_system = { security: { gte: 0, lte: 0.45 } };
            break;
        case "nullsec":
            where.solar_system = { security: { lte: 0 } };
            break;
        case "pochven":
            where.region_id = 10000070;
            break;
        case "solo":
            where.is_solo = true;
            break;
        case "npc":
            where.is_npc = true;
            break;
        case "5b":
            where.total_value = { gte: 5_000_000_000 };
            break;
        case "10b":
            where.total_value = { gte: 10_000_000_000 };
            break;
        default:
            break;
    }

    const groupIds = shipGroupFilters[type];
    if (groupIds && groupIds.length) {
        where.victim = { ship_group_id: { in: groupIds } };
    }

    if (type === "structureboys") {
        where.AND = [
            { victim: { ship_group_id: { not: 1657 } } },
            {
                items: {
                    some: {
                        item_type_id: {
                            in: [
                                56201, 56202, 56203, 56204, 56205, 56206,
                                56207, 56208,
                            ],
                        },
                        flag: 5,
                        quantity_dropped: 0,
                    },
                },
            },
        ];
    }

    // t1/t2/t3/faction: use dogma/meta if available; fallback empty until dogma data is stored
    return where;
}

export default defineCachedEventHandler(
    async (event) => {
        const query = getQuery(event);
        const listType = (query.list as string)?.toLowerCase() as KilllistType;
        const type: KilllistType = (listType && listType in shipGroupFilters
            ? listType
            : "latest") as KilllistType;
        const page = Math.max(parseInt((query.page as string) || "1"), 1);
        const limit = Math.min(parseInt((query.limit as string) || "50"), 200);
        const skip = (page - 1) * limit;

        const where = await buildWhere(type);

        const [killmails, total] = await Promise.all([
            prisma.killmail.findMany({
                where,
                orderBy: { killmail_time: "desc" },
                take: limit,
                skip,
                include: {
                    solar_system: { select: { system_name: true, security: true, region_id: true } },
                    region: { select: { region_name: true } },
                    attackers: {
                        select: {
                            character_id: true,
                            corporation_id: true,
                            alliance_id: true,
                            faction_id: true,
                            final_blow: true,
                            ship_group: { select: { group_name: true } },
                            character: { select: { name: true } },
                            corporation: { select: { name: true } },
                            alliance: { select: { name: true } },
                            faction: { select: { name: true } },
                        },
                    },
                    victim: {
                        select: {
                            character_id: true,
                            corporation_id: true,
                            alliance_id: true,
                            faction_id: true,
                            ship_type_id: true,
                            ship_group_id: true,
                            character: { select: { name: true } },
                            corporation: { select: { name: true } },
                            alliance: { select: { name: true } },
                            faction: { select: { name: true } },
                            ship_type: { select: { name: true } },
                            ship_group: { select: { group_name: true } },
                        },
                    },
                },
            }),
            prisma.killmail.count({ where }),
        ]);

        return {
            killmails: killmails.map(formatKillmail),
            pagination: {
                currentPage: page,
                totalPages: Math.ceil(total / limit),
                totalKillmails: total,
                limit,
            },
        };
    },
    {
        maxAge: 30,
        staleMaxAge: 0,
        swr: true,
        base: "redis",
        getKey: (event) => {
            const query = getQuery(event);
            const list = (query.list as string) || "latest";
            const page = (query.page as string) || "1";
            const limit = (query.limit as string) || "50";
            return `killlist:${list}:page:${page}:limit:${limit}`;
        },
    }
);
