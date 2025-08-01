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

    // Get collection name and document ID from route params
    const collectionName = getRouterParam(event, "collection");
    const documentId = getRouterParam(event, "id");

    if (!collectionName) {
        throw createError({
            statusCode: 400,
            statusMessage: "Collection name is required",
        });
    }

    if (!documentId) {
        throw createError({
            statusCode: 400,
            statusMessage: "Document ID is required",
        });
    }

    try {
        // Get the model based on collection name using the same mapping as data.get.ts
        const modelNameMap: Record<string, any> = {
            accesslogs: AccessLogs,
            alliances: Alliances,
            battles: Battles,
            bloodlines: Bloodlines,
            campaigns: Campaigns,
            celestials: Celestials,
            characterachievements: CharacterAchievements,
            characters: Characters,
            comments: Comments,
            config: Config,
            constellations: Constellations,
            corporations: Corporations,
            customprices: CustomPrices,
            dscan: DScan,
            esilogs: ESILogs,
            factions: Factions,
            historicalstats: HistoricalStats,
            invflags: InvFlags,
            invgroups: InvGroups,
            invtypes: InvTypes,
            killmails: Killmails,
            killmailsesi: KillmailsESI,
            localscan: LocalScan,
            prices: Prices,
            races: Races,
            regions: Regions,
            savedquery: SavedQuery,
            solarsystems: SolarSystems,
            stats: Stats,
            users: Users,
            wars: Wars,
        };

        const Model = modelNameMap[collectionName.toLowerCase()];
        if (!Model) {
            throw createError({
                statusCode: 404,
                statusMessage: `Unknown collection '${collectionName}'`,
            });
        }

        // Delete the document
        const deletedDocument = await Model.findByIdAndDelete(
            documentId
        ).lean();

        if (!deletedDocument) {
            throw createError({
                statusCode: 404,
                statusMessage: "Document not found",
            });
        }

        return {
            success: true,
            message: "Document deleted successfully",
            deletedId: documentId,
        };
    } catch (error: any) {
        cliLogger.error(
            `Error deleting document from '${collectionName}': ${error}`
        );

        // Handle cast errors (invalid ObjectId, etc.)
        if (error?.name === "CastError") {
            throw createError({
                statusCode: 400,
                statusMessage: `Invalid document ID format: ${error.message}`,
            });
        }

        throw createError({
            statusCode: 500,
            statusMessage: `Failed to delete document from collection '${collectionName}'`,
        });
    }
});
