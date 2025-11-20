import prisma from "~/lib/prisma";

const TABLE_MAP: Record<string, string> = {
    alliances: "alliances",
    battles: "battles",
    bloodlines: "bloodlines",
    campaigns: "campaigns",
    celestials: "celestials",
    characterachievements: "character_achievements",
    characters: "characters",
    comments: "comments",
    config: "config",
    constellations: "constellations",
    corporations: "corporations",
    customprices: "custom_prices",
    dscan: "dscan",
    esilogs: "esi_logs",
    factions: "factions",
    historicalstats: "historical_stats",
    invflags: "inv_flags",
    invgroups: "inv_groups",
    invtypes: "inv_types",
    killmails: "killmails",
    killmailsesi: "killmails_esi",
    localscan: "local_scan",
    prices: "prices",
    races: "races",
    regions: "regions",
    savedquery: "saved_query",
    solarsystems: "solar_systems",
    stats: "stats",
    users: "users",
    wars: "wars",
};

export default defineEventHandler(async (event) => {
    await requireAdminAuth(event);

    const collectionName = getRouterParam(event, "collection")?.toLowerCase();
    const table = collectionName ? TABLE_MAP[collectionName] : null;

    if (!table) {
        throw createError({
            statusCode: 404,
            statusMessage: `Unknown collection '${collectionName}'`,
        });
    }

    const query = getQuery(event);
    const page = Math.max(1, parseInt(query.page as string) || 1);
    const limit = Math.min(
        100,
        Math.max(1, parseInt(query.limit as string) || 20)
    );
    const skip = (page - 1) * limit;
    const sortField = (query.sort as string) || "id";
    const sortOrder = query.order === "desc" ? "DESC" : "ASC";
    const searchQuery = (query.search as string) || "";

    let whereClause = "";
    if (searchQuery) {
        whereClause = `WHERE cast(${sortField} as text) ILIKE '%${searchQuery}%'`;
    }

    const rows = await prisma.$queryRawUnsafe(
        `SELECT * FROM ${table} ${whereClause} ORDER BY ${sortField} ${sortOrder} OFFSET ${skip} LIMIT ${limit}`
    );

    const [{ count }] = await prisma.$queryRawUnsafe<
        { count: string }[]
    >(`SELECT count(*) as count FROM ${table} ${whereClause}`);

    const total = Number(count || 0);
    const totalPages = Math.ceil(total / limit);

    return {
        success: true,
        data: rows,
        pagination: {
            page,
            limit,
            total,
            totalPages,
            hasNext: page < totalPages,
            hasPrev: page > 1,
        },
        meta: {
            collection: collectionName,
            sortField,
            sortOrder: sortOrder.toLowerCase(),
            searchQuery,
        },
    };
});
