import prisma from "~/lib/prisma";
import { CustomDomainService } from "~/server/services";

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
    if (!orFilters.length) return {};
    return { OR: orFilters };
}

function timeRangeFilter(range: string) {
    if (!range || range === "all") return {};
    const daysMap: Record<string, number> = {
        "1d": 1,
        "7d": 7,
        "14d": 14,
        "30d": 30,
        "90d": 90,
    };
    const days = daysMap[range] || 7;
    const timeFrom = new Date();
    timeFrom.setDate(timeFrom.getDate() - days);
    timeFrom.setHours(0, 0, 0, 0);
    return { killmail_time: { gte: timeFrom } };
}

export default defineCachedEventHandler(
    async (event) => {
        const domain = getRouterParam(event, "domain");
        if (!domain) {
            throw createError({
                statusCode: 400,
                statusMessage: "Domain parameter required",
            });
        }

        const query = getQuery(event);
        const timeRange = (query.timeRange as string) || "7d";

        const domainConfig = await CustomDomainService.findActiveDomain(
            domain.toLowerCase()
        );
        if (!domainConfig) {
            throw createError({
                statusCode: 404,
                statusMessage: "Domain not found or not active",
            });
        }

        const entities = domainConfig.entities || [];
        if (!entities.length) {
            throw createError({
                statusCode: 400,
                statusMessage: "No entities configured for domain",
            });
        }

        const where = {
            ...buildEntityFilters(entities),
            ...timeRangeFilter(timeRange),
        };

        // Totals
        const [killCount, totalValueAgg] = await Promise.all([
            prisma.killmail.count({ where }),
            prisma.killmail.aggregate({
                _sum: { total_value: true },
                where,
            }),
        ]);

        const mostValuableKills = await prisma.killmail.findMany({
            where,
            orderBy: { total_value: "desc" },
            take: 10,
            select: {
                killmail_id: true,
                total_value: true,
                killmail_time: true,
                victim: {
                    select: {
                        ship_type_id: true,
                        ship_type: { select: { name: true } },
                        character_id: true,
                        character: { select: { name: true } },
                        corporation_id: true,
                        corporation: { select: { name: true } },
                        alliance_id: true,
                        alliance: { select: { name: true } },
                    },
                },
            },
        });

        const topAttackers = await prisma.killmailAttacker.groupBy({
            by: ["character_id", "corporation_id", "alliance_id"],
            where: {
                killmail: where,
            } as any,
            _count: { _all: true },
            orderBy: { _count: { _all: "desc" } },
            take: 30,
        });

        const shipGroupStats = await prisma.killmailVictim.groupBy({
            by: ["ship_group_id"],
            where: {
                killmail: where,
            } as any,
            _count: { _all: true },
            _sum: { damage_taken: true },
            orderBy: { _count: { _all: "desc" } },
            take: 20,
        });

        const totalValue = Number(totalValueAgg._sum.total_value || 0);

        return {
            totalKills: killCount,
            totalValue,
            mostValuableKills,
            shipGroupStats,
            topAttackers,
        };
    },
    {
        maxAge: 300,
        staleMaxAge: -1,
        swr: true,
        base: "redis",
        getKey: (event) => {
            const query = getQuery(event);
            const timeRange = (query.timeRange as string) || "7d";
            return `domain:stats:${getRouterParam(event, "domain")}:${timeRange}`;
        },
    }
);
