import prisma from "~/lib/prisma";

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

export default defineCachedEventHandler(
    async (event: any) => {
        const query = getQuery(event);
        const type = event.context.params?.type;
        const id = event.context.params?.id;
        let page: number = Number(query.page) || 1;
        let limit: number = Number(query.limit) || 100;
        if (page < 1) page = 1;
        if (limit < 1) limit = 1;
        if (limit > 1000) limit = 1000;

        const idNum = Number(id);
        const victimWhere =
            type === "character"
                ? { victim: { character_id: idNum } }
                : type === "corporation"
                ? { victim: { corporation_id: idNum } }
                : { victim: { alliance_id: idNum } };

        const killmails = await prisma.killmail.findMany({
            where: victimWhere,
            orderBy: { killmail_time: "desc" },
            take: limit,
            skip: (page - 1) * limit,
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
        });

        return killmails.map(formatKillmail);
    },
    {
        maxAge: 30,
        staleMaxAge: 0,
        swr: true,
        base: "redis",
        getKey: (event: any) => {
            const type = event.context.params?.type;
            const id = event.context.params?.id;
            const query = getQuery(event);
            const page = query?.page ? query.page.toString() : "1";
            const limit = query?.limit ? query.limit.toString() : "100";
            return `killlist:losses:${type}:${id}:page:${page}:limit:${limit}`;
        },
    }
);
