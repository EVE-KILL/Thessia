import type { Model } from "mongoose";

/**
 * Define which collections are allowed for export and their respective models
 */
const ALLOWED_COLLECTIONS: Record<string, Model<any>> = {
    alliances: Alliances,
    battles: Battles,
    bloodlines: Bloodlines,
    campaigns: Campaigns,
    celestials: Celestials,
    characterachievements: CharacterAchievements,
    characters: Characters,
    comments: Comments,
    constellations: Constellations,
    corporations: Corporations,
    customprices: CustomPrices,
    factions: Factions,
    historicalstats: HistoricalStats,
    invflags: InvFlags,
    invgroups: InvGroups,
    invtypes: InvTypes,
    killmails: Killmails,
    killmailsesi: KillmailsESI,
    prices: Prices,
    races: Races,
    regions: Regions,
    solarsystems: SolarSystems,
    stats: Stats,
    wars: Wars,
};

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

/**
 * GET /api/export
 * Returns information about available collections for export
 */
export default defineEventHandler(
    async (event): Promise<IExportCollectionInfo[]> => {
        const collections: IExportCollectionInfo[] = [];

        // Define rate limit examples for documentation
        const rateLimitExamples = {
            "10000": getRateLimitForRequestSize(10000),
            "1000": getRateLimitForRequestSize(1000),
            "100": getRateLimitForRequestSize(100),
            "10": getRateLimitForRequestSize(10),
        };

        // Set informational headers
        setHeader(
            event,
            "X-Export-Rate-Limit-Info",
            "See rateLimits field in response"
        );
        setHeader(event, "X-Export-Max-Limit", "10000");
        setHeader(event, "X-Export-Min-Limit", "1");
        setHeader(event, "X-Export-Default-Limit", "1000");

        // Get estimated count for each allowed collection
        for (const [collectionName, model] of Object.entries(
            ALLOWED_COLLECTIONS
        )) {
            try {
                const estimatedCount = await model.estimatedDocumentCount();
                collections.push({
                    collection: collectionName,
                    estimatedCount,
                    rateLimits: rateLimitExamples,
                });
            } catch (error) {
                // If there's an error getting count, still include the collection but with 0 count
                collections.push({
                    collection: collectionName,
                    estimatedCount: 0,
                    rateLimits: rateLimitExamples,
                });
            }
        }

        // Sort by collection name for consistent ordering
        collections.sort((a, b) => a.collection.localeCompare(b.collection));

        return collections;
    }
);
