import { createHash } from "crypto";
import { KillmailService, CustomDomainService } from "~/server/services";

function buildEntityFilters(entities: any[]) {
    const orFilters: any[] = [];
    for (const entity of entities) {
        if (entity.entity_type === "character") {
            orFilters.push(
                { victim: { character_id: entity.entity_id } },
                { attackers: { some: { character_id: entity.entity_id } } }
            );
        } else if (entity.entity_type === "corporation") {
            orFilters.push(
                { victim: { corporation_id: entity.entity_id } },
                { attackers: { some: { corporation_id: entity.entity_id } } }
            );
        } else if (entity.entity_type === "alliance") {
            orFilters.push(
                { victim: { alliance_id: entity.entity_id } },
                { attackers: { some: { alliance_id: entity.entity_id } } }
            );
        }
    }
    if (orFilters.length === 0) return {};
    return { OR: orFilters };
}

function timeRangeFilter(range: string) {
    if (!range || range === "all") return {};
    const daysMap: Record<string, number> = {
        "24h": 1,
        "7d": 7,
        "30d": 30,
        "90d": 90,
    };
    const days = daysMap[range] || 7;
    const timeFrom = new Date();
    timeFrom.setDate(timeFrom.getDate() - days);
    timeFrom.setHours(0, 0, 0, 0);
    return { killmail_time: { gte: timeFrom } };
}

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
    async (event) => {
        const domain = getRouterParam(event, "domain");
        if (!domain) {
            throw createError({
                statusCode: 400,
                statusMessage: "Domain parameter is required",
            });
        }

        const query = getQuery(event);
        const timeRange = (query.timeRange as string) || "7d";
        const entityFilter = query.entityFilter as string;
        const page = parseInt((query.page as string) || "1");
        const limit = Math.min(parseInt((query.limit as string) || "50"), 100);
        const sortField = (query.sort as string) || "killmail_time";
        const sortOrder = (query.order as string) || "desc";

        const domainConfig = await CustomDomainService.findActiveDomain(
            domain.toLowerCase()
        );
        if (!domainConfig) {
            throw createError({
                statusCode: 404,
                statusMessage: "Domain not found or not active",
            });
        }

        let entities = domainConfig.entities || [];
        if (entityFilter) {
            const [entityType, entityIdStr] = entityFilter.split(":");
            const entityId = parseInt(entityIdStr);
            if (entityType && entityId) {
                const specificEntity = entities.find(
                    (e: any) =>
                        e.entity_type === entityType && e.entity_id === entityId
                );
                if (specificEntity) entities = [specificEntity];
            }
        }

        const where = {
            ...buildEntityFilters(entities),
            ...timeRangeFilter(timeRange),
        };

        const skip = (page - 1) * limit;
        const sort = { [sortField]: sortOrder === "asc" ? "asc" : "desc" } as any;

        const [data, total] = await Promise.all([
            prisma.killmail.findMany({
                where,
                orderBy: sort,
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

        const killmails = data.map(formatKillmail);
        const totalPages = Math.ceil(total / limit);

        return {
            killmails,
            pagination: {
                currentPage: page,
                totalPages,
                totalKillmails: total,
                limit,
            },
        };
    },
    {
        maxAge: 60,
        staleMaxAge: 0,
        swr: true,
        base: "redis",
        getKey: (event) => {
            const domain = getRouterParam(event, "domain");
            const query = getQuery(event);
            const hashInput = JSON.stringify(query);
            const hash = createHash("md5")
                .update(hashInput)
                .digest("hex")
                .substring(0, 8);
            return `domain:${domain}:killmails:${hash}`;
        },
    }
);
