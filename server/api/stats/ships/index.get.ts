import prisma from "~/lib/prisma";
import { TypeService } from "~/server/services";

async function topLostShips(
    dateFrom: Date | null = null,
    dateTo: Date | null = null,
    limit = 10
) {
    const to = dateTo ?? new Date();
    const from =
        dateFrom ??
        new Date((dateTo ?? new Date()).getTime() - 7 * 24 * 60 * 60 * 1000);

    const rows = await prisma.killmailVictim.groupBy({
        by: ["ship_type_id"],
        where: {
            ship_type_id: { notIn: [0, 670] },
            killmail: {
                killmail_time: {
                    gte: from,
                    lte: to,
                },
            },
        },
        _count: { _all: true },
        orderBy: { _count: { _all: "desc" } },
        take: Math.min(limit, 100),
    });

    const shipIds = rows.map((r) => r.ship_type_id);
    const ships = await TypeService.findManyByIds(shipIds);
    const shipMap = new Map(ships.map((s) => [s.type_id, s.name]));

    return rows.map((row) => ({
        type_id: row.ship_type_id,
        name: shipMap.get(row.ship_type_id) || "Unknown",
        count: row._count._all,
    }));
}

export default defineCachedEventHandler(
    async (event) => {
        const query = getQuery(event);

        const dateFrom = query.from ? new Date(query.from as string) : null;
        const dateTo = query.to ? new Date(query.to as string) : null;
        const limit = query.limit ? parseInt(query.limit as string, 10) : 10;

        if (dateFrom && isNaN(dateFrom.getTime())) {
            throw createError({
                statusCode: 400,
                statusMessage:
                    "Invalid 'from' date format. Use ISO 8601 format (YYYY-MM-DDTHH:mm:ss.sssZ)",
            });
        }

        if (dateTo && isNaN(dateTo.getTime())) {
            throw createError({
                statusCode: 400,
                statusMessage:
                    "Invalid 'to' date format. Use ISO 8601 format (YYYY-MM-DDTHH:mm:ss.sssZ)",
            });
        }

        const mostLostShips = await topLostShips(dateFrom, dateTo, limit);

        return {
            mostLostShips,
            meta: {
                from: dateFrom,
                to: dateTo,
                limit,
            },
        };
    },
    {
        maxAge: 300,
        staleMaxAge: -1,
        swr: true,
        base: "redis",
        getKey: (event) => {
            const query = getQuery(event);
            const from = (query.from as string) || "default";
            const to = (query.to as string) || "now";
            const limit = (query.limit as string) || "10";
            return `stats:ships:from:${from}:to:${to}:limit:${limit}`;
        },
    }
);
