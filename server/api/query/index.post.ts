import prisma from "~/lib/prisma";

type KillmailField =
    | "killmail_id"
    | "killmail_hash"
    | "killmail_time"
    | "solar_system_id"
    | "constellation_id"
    | "region_id"
    | "total_value"
    | "fitting_value"
    | "ship_value"
    | "is_npc"
    | "is_solo"
    | "war_id"
    | "near";

const MAX_LIMIT = 1000;
const DEFAULT_LIMIT = 100;

function buildWhere(filter: Record<string, any>) {
    const where: any = {};

    for (const [key, value] of Object.entries(filter || {})) {
        switch (key) {
            case "killmail_id":
            case "solar_system_id":
            case "constellation_id":
            case "region_id":
            case "war_id":
                where[key] = value;
                break;
            case "is_npc":
            case "is_solo":
                where[key] = !!value;
                break;
            case "killmail_time":
                // support { gte/lte/gt/lt: date }
                where.killmail_time = value;
                break;
            case "total_value":
            case "fitting_value":
            case "ship_value":
                where[key] = value;
                break;
            case "victim.character_id":
                where.victim = { character_id: value as number };
                break;
            case "victim.corporation_id":
                where.victim = { corporation_id: value as number };
                break;
            case "victim.alliance_id":
                where.victim = { alliance_id: value as number };
                break;
            case "attackers.character_id":
                where.attackers = { some: { character_id: value as number } };
                break;
            case "attackers.corporation_id":
                where.attackers = { some: { corporation_id: value as number } };
                break;
            case "attackers.alliance_id":
                where.attackers = { some: { alliance_id: value as number } };
                break;
            default:
                break;
        }
    }

    return where;
}

export default defineEventHandler(async (event) => {
    const body = await readBody(event);
    const filter = (body?.filter || {}) as Record<string, any>;
    const options = body?.options || {};

    const limit = Math.min(
        Math.max(parseInt(options.limit as string, 10) || DEFAULT_LIMIT, 1),
        MAX_LIMIT
    );
    const skip = Math.max(parseInt(options.skip as string, 10) || 0, 0);
    const sort = options.sort || { killmail_time: -1 };
    const projection = options.projection as Record<string, 0 | 1> | undefined;

    const where = buildWhere(filter);

    const orderBy = Object.entries(sort).map(([field, dir]) => ({
        [field]: dir === -1 || dir === "desc" ? "desc" : "asc",
    })) as any;

    const select =
        projection &&
        Object.entries(projection).reduce((acc: any, [field, include]) => {
            if (include === 1) acc[field] = true;
            return acc;
        }, {});

    const killmails = await prisma.killmail.findMany({
        where,
        orderBy,
        take: limit,
        skip,
        select: select && Object.keys(select).length > 0 ? select : undefined,
    });

    return {
        results: killmails,
        count: killmails.length,
        limit,
        skip,
    };
});
