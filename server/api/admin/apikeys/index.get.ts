export default defineEventHandler(async (event) => {
    // Authenticate and verify admin privileges
    await requireAdminAuth(event);

    try {
        // Get query parameters for pagination and filtering
        const query = getQuery(event);
        const {
            search = "",
            active = "all",
            sortField = "createdAt",
            order = "desc",
            page = "1",
            limit = "25",
        } = query;

        // Convert query parameters to proper types
        const pageNum = Math.max(1, parseInt(page as string) || 1);
        const limitNum = Math.max(
            1,
            Math.min(100, parseInt(limit as string) || 25)
        );
        const skip = (pageNum - 1) * limitNum;

        // Build MongoDB query
        const mongoQuery: any = {};

        // Add search filter
        if (search && typeof search === "string" && search.trim() !== "") {
            mongoQuery.$or = [
                { name: { $regex: search.trim(), $options: "i" } },
                { description: { $regex: search.trim(), $options: "i" } },
            ];
        }

        // Add active filter
        if (active === "true") {
            mongoQuery.active = true;
        } else if (active === "false") {
            mongoQuery.active = false;
        }

        // Build sort options
        const sortOptions: any = {};
        if (
            typeof sortField === "string" &&
            ["name", "createdAt", "lastUsed", "active"].includes(sortField)
        ) {
            sortOptions[sortField] = order === "desc" ? -1 : 1;
        } else {
            sortOptions.createdAt = -1; // Default sort
        }

        // Execute queries
        const [apiKeys, totalCount] = await Promise.all([
            ApiKeys.find(mongoQuery)
                .sort(sortOptions)
                .skip(skip)
                .limit(limitNum)
                .select("-key") // Don't return the actual API key for security
                .lean(),
            ApiKeys.countDocuments(mongoQuery),
        ]);

        // Get creator character names from Users
        const creatorIds = [...new Set(apiKeys.map((key) => key.createdBy))];
        const creators = await Users.find({ characterId: { $in: creatorIds } })
            .select("characterId characterName")
            .lean();

        const creatorMap = new Map(
            creators.map((c) => [c.characterId, c.characterName])
        );

        // Enhance api keys with creator names
        const enhancedApiKeys = apiKeys.map((key) => ({
            ...key,
            createdByName: creatorMap.get(Number(key.createdBy)) || "Unknown",
        }));

        return {
            success: true,
            data: enhancedApiKeys,
            pagination: {
                page: pageNum,
                limit: limitNum,
                total: totalCount,
                totalPages: Math.ceil(totalCount / limitNum),
                hasNext: pageNum < Math.ceil(totalCount / limitNum),
                hasPrev: pageNum > 1,
            },
        };
    } catch (error) {
        throw createError({
            statusCode: 500,
            statusMessage: "Failed to fetch API keys",
        });
    }
});
