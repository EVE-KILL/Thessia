import prisma from "~/lib/prisma";

const ALLOWED = [
    "alliances",
    "battles",
    "bloodlines",
    "campaigns",
    "celestials",
    "characterachievements",
    "characters",
    "comments",
    "constellations",
    "corporations",
    "customprices",
    "factions",
    "historicalstats",
    "invflags",
    "invgroups",
    "invtypes",
    "killmails",
    "killmailsesi",
    "prices",
    "races",
    "regions",
    "solarsystems",
    "stats",
    "wars",
];

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

function getRateLimitForRequestSize(limit: number) {
    return {
        requestsPerSecond: Math.max(1, Math.floor(10000 / limit)),
        maxBurstRequests: Math.min(10, Math.max(1, Math.floor(1000 / limit))),
    };
}

export interface IExportCollectionInfo {
    collection: string;
    estimatedCount: number;
    rateLimits: {
        [limit: string]: {
            requestsPerSecond: number;
            maxBurstRequests: number;
        };
    };
}

export default defineEventHandler(
    async (event): Promise<IExportCollectionInfo[]> => {
        const collections: IExportCollectionInfo[] = [];

        const rateLimitExamples = {
            "10000": getRateLimitForRequestSize(10000),
            "1000": getRateLimitForRequestSize(1000),
            "100": getRateLimitForRequestSize(100),
            "10": getRateLimitForRequestSize(10),
        };

        setHeader(
            event,
            "X-Export-Rate-Limit-Info",
            "See rateLimits field in response"
        );
        setHeader(event, "X-Export-Max-Limit", "10000");
        setHeader(event, "X-Export-Min-Limit", "1");
        setHeader(event, "X-Export-Default-Limit", "1000");

        for (const collection of ALLOWED) {
            const table = TABLE_MAP[collection];
            let estimatedCount = 0;
            try {
                const [{ count }] = await prisma.$queryRaw<{ count: bigint }[]>`
                    SELECT reltuples::BIGINT as count
                    FROM pg_class
                    WHERE relname = ${table}
                `;
                estimatedCount = Number(count || 0);
            } catch (_err) {
                estimatedCount = 0;
            }
            collections.push({
                collection,
                estimatedCount,
                rateLimits: rateLimitExamples,
            });
        }

        collections.sort((a, b) => a.collection.localeCompare(b.collection));

        return collections;
    }
);
