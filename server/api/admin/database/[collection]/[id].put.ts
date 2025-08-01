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
        // Get the request body with updated document data
        const updateData = await readBody(event);

        if (!updateData || typeof updateData !== "object") {
            throw createError({
                statusCode: 400,
                statusMessage: "Valid update data is required",
            });
        }

        // Get the model based on collection name using the same mapping as data.get.ts
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

        // Remove system fields that shouldn't be updated
        const { _id, __v, createdAt, ...cleanUpdateData } = updateData;

        // Add updatedAt timestamp
        cleanUpdateData.updatedAt = new Date();

        // Update the document
        const updatedDocument = await Model.findByIdAndUpdate(
            documentId,
            cleanUpdateData,
            {
                new: true, // Return updated document
                runValidators: true, // Run schema validation
            }
        ).lean();

        if (!updatedDocument) {
            throw createError({
                statusCode: 404,
                statusMessage: "Document not found",
            });
        }

        return {
            success: true,
            document: updatedDocument,
            message: "Document updated successfully",
        };
    } catch (error: any) {
        cliLogger.error(
            `Error updating document in '${collectionName}': ${error}`
        );

        // Handle validation errors
        if (error?.name === "ValidationError") {
            throw createError({
                statusCode: 400,
                statusMessage: `Validation error: ${error.message}`,
            });
        }

        // Handle cast errors (invalid ObjectId, etc.)
        if (error?.name === "CastError") {
            throw createError({
                statusCode: 400,
                statusMessage: `Invalid data format: ${error.message}`,
            });
        }

        throw createError({
            statusCode: 500,
            statusMessage: `Failed to update document in collection '${collectionName}'`,
        });
    }
});
