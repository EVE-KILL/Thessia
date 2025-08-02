import { promises as fs } from "fs";
import path from "path";

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
    // Add cache-control headers to prevent caching
    setResponseHeaders(event, {
        "Cache-Control": "no-cache, no-store, must-revalidate",
        Pragma: "no-cache",
        Expires: "0",
    });

    // Get authentication cookie
    const cookieName = "evelogin";
    const cookie = getCookie(event, cookieName);

    if (!cookie) {
        throw createError({
            statusCode: 401,
            statusMessage: "Authentication required",
        });
    }

    // Find user by cookie value
    const user = await Users.findOne({ uniqueIdentifier: cookie });
    if (!user) {
        throw createError({
            statusCode: 401,
            statusMessage: "Invalid session",
        });
    }

    // Check if user is administrator
    if (!user.administrator) {
        throw createError({
            statusCode: 403,
            statusMessage: "Administrator access required",
        });
    }

    try {
        // Read the models directory
        const modelsPath = path.join(process.cwd(), "server", "models");
        const files = await fs.readdir(modelsPath);

        // Model name mapping to collection names
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

        // Filter TypeScript files and extract collection names
        const collections = files
            .filter((file) => file.endsWith(".ts"))
            .map((file) => {
                const modelName = file.replace(".ts", "");
                const collectionName =
                    modelToCollectionMap[modelName] || modelName.toLowerCase();
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
