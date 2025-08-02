/**
 * Format collection name for display
 */
function formatCollectionName(name: string): string {
    // Convert camelCase and PascalCase to Title Case
    return name
        .replace(/([A-Z])/g, " $1")
        .replace(/^./, (str) => str.toUpperCase())
        .trim();
}

export default defineEventHandler(async (event) => {
    // Authenticate and verify admin privileges
    await requireAdminAuth(event);

    try {
        // Model name mapping to collection names (same as in data.get.ts)
        const modelToCollectionMap: Record<string, string> = {
            AccessLogs: "accesslogs",
            Alliances: "alliances",
            Battles: "battles",
            Bloodlines: "bloodlines",
            Campaigns: "campaigns",
            Celestials: "celestials",
            CharacterAchievements: "characterachievements",
            Characters: "characters",
            Comments: "comments",
            Config: "config",
            Constellations: "constellations",
            Corporations: "corporations",
            CustomPrices: "customprices",
            DScan: "dscan",
            ESILogs: "esilogs",
            Factions: "factions",
            HistoricalStats: "historicalstats",
            InvFlags: "invflags",
            InvGroups: "invgroups",
            InvTypes: "invtypes",
            Killmails: "killmails",
            KillmailsESI: "killmailsesi",
            LocalScan: "localscan",
            Prices: "prices",
            Races: "races",
            Regions: "regions",
            SavedQuery: "savedquery",
            SolarSystems: "solarsystems",
            Stats: "stats",
            Users: "users",
            Wars: "wars",
        };

        // Use the modelToCollectionMap directly instead of reading files
        const collections = Object.entries(modelToCollectionMap)
            .map(([modelName, collectionName]) => {
                return {
                    name: collectionName,
                    displayName: formatCollectionName(modelName),
                    count: 0, // We'll get actual counts when individual collections are viewed
                    size: 0,
                    avgObjSize: 0,
                    storageSize: 0,
                    indexes: 0,
                };
            })
            .sort((a, b) => a.displayName.localeCompare(b.displayName));

        return {
            success: true,
            collections,
            total: collections.length,
        };
    } catch (error) {
        cliLogger.error(`Error fetching database collections: ${error}`);
        throw createError({
            statusCode: 500,
            statusMessage: "Failed to fetch database collections",
        });
    }
});
