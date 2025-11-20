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
    constellations: "constellations",
    corporations: "corporations",
    customprices: "custom_prices",
    factions: "factions",
    historicalstats: "historical_stats",
    invflags: "inv_flags",
    invgroups: "inv_groups",
    invtypes: "inv_types",
    killmails: "killmails",
    killmailsesi: "killmails_esi",
    prices: "prices",
    races: "races",
    regions: "regions",
    solarsystems: "solar_systems",
    stats: "stats",
    wars: "wars",
};

const DEFAULT_LIMIT = 1000;
const MAX_LIMIT = 10000;

export default defineCachedEventHandler(
    async (event) => {
        const collection = event.context.params?.collection?.toLowerCase();
        const table = collection ? TABLE_MAP[collection] : null;

        if (!table) {
            throw createError({
                statusCode: 400,
                statusMessage: "Invalid collection",
            });
        }

        const query = getQuery(event);
        const limit = Math.min(
            Math.max(parseInt((query.limit as string) || `${DEFAULT_LIMIT}`), 1),
            MAX_LIMIT
        );
        const offset = Math.max(parseInt((query.offset as string) || "0"), 0);

        const rows = await prisma.$queryRawUnsafe(
            `SELECT * FROM ${table} OFFSET ${offset} LIMIT ${limit}`
        );

        setHeader(event, "Content-Type", "application/json");
        return {
            collection,
            count: rows.length,
            data: rows,
        };
    },
    {
        maxAge: 60,
        staleMaxAge: 0,
        swr: true,
        base: "redis",
        getKey: (event) => {
            const collection = event.context.params?.collection;
            const query = getQuery(event);
            const limit = query?.limit || DEFAULT_LIMIT;
            const offset = query?.offset || 0;
            return `export:${collection}:limit:${limit}:offset:${offset}`;
        },
    }
);
