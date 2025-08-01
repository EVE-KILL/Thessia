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

    // Get collection name from route params
    const collectionName = getRouterParam(event, "collection");

    if (!collectionName) {
        throw createError({
            statusCode: 400,
            statusMessage: "Collection name is required",
        });
    }

    try {
        // Get query parameters for pagination and filtering
        const query = getQuery(event);
        const page = Math.max(1, parseInt(query.page as string) || 1);
        const limit = Math.min(
            100,
            Math.max(1, parseInt(query.limit as string) || 20)
        );
        const skip = (page - 1) * limit;
        const sortField = (query.sort as string) || "_id";
        const sortOrder = query.order === "desc" ? -1 : 1;
        const searchQuery = (query.search as string) || "";

        // Get the model based on collection name
        // We need to map the lowercase collection name back to the proper model name
        const modelNameMap: Record<string, any> = {
            accesslogstats: AccessLogStats,
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

        // Build search filter if provided
        let filter = {};
        if (searchQuery) {
            // Simple text search across string fields
            // This is a basic implementation - you might want to customize per model
            filter = {
                $or: [
                    { name: { $regex: searchQuery, $options: "i" } },
                    { characterName: { $regex: searchQuery, $options: "i" } },
                    { corporationName: { $regex: searchQuery, $options: "i" } },
                    { allianceName: { $regex: searchQuery, $options: "i" } },
                    { title: { $regex: searchQuery, $options: "i" } },
                    { description: { $regex: searchQuery, $options: "i" } },
                ],
            };
        }

        // Get total count
        const total = await Model.estimatedDocumentCount();

        // Get paginated data
        const sortOption = { [sortField]: sortOrder };
        const documents = await Model.find(filter)
            .sort(sortOption)
            .skip(skip)
            .limit(limit)
            .lean();

        // Calculate pagination info
        const totalPages = Math.ceil(total / limit);
        const hasNext = page < totalPages;
        const hasPrev = page > 1;

        return {
            success: true,
            data: documents,
            pagination: {
                page,
                limit,
                total,
                totalPages,
                hasNext,
                hasPrev,
            },
            meta: {
                collection: collectionName,
                sortField,
                sortOrder: sortOrder === 1 ? "asc" : "desc",
                searchQuery,
            },
        };
    } catch (error) {
        cliLogger.error(
            `Error fetching collection data for '${collectionName}': ${error}`
        );
        throw createError({
            statusCode: 500,
            statusMessage: `Failed to fetch data from collection '${collectionName}'`,
        });
    }
});
