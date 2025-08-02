export default defineEventHandler(async (event) => {
    // Authenticate and verify admin privileges
    await requireAdminAuth(event);

    try {
        // Get query parameters
        const query = getQuery(event);
        const {
            search = "",
            adminsOnly = "false",
            sortField = "lastChecked",
            order = "desc",
            page = "1",
            limit = "25",
        } = query;

        // Convert query parameters to proper types
        const pageNum = Math.max(1, parseInt(page as string) || 1);
        const limitNum = Math.min(
            100,
            Math.max(1, parseInt(limit as string) || 25)
        );
        const skip = (pageNum - 1) * limitNum;
        const isAdminsOnly = adminsOnly === "true";
        const searchTerm = (search as string).trim();
        const sortOrder = order === "asc" ? 1 : -1;

        // Build the filter object
        const filter: any = {};

        // Filter by admin status if requested
        if (isAdminsOnly) {
            filter.administrator = true;
        }

        // Add search filter if search term is provided
        if (searchTerm) {
            // Use fuzzy search with regex for partial matching
            // This allows searching for "karb" to find "Karbowiak"
            const searchRegex = new RegExp(
                searchTerm.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
                "i"
            );
            filter.characterName = { $regex: searchRegex };
        }

        // Build sort object
        const sort: any = {};
        sort[sortField as string] = sortOrder;

        // Execute the query with pagination
        const [users, totalCount] = await Promise.all([
            Users.find(filter)
                .select("-accessToken -refreshToken") // Exclude sensitive fields
                .sort(sort)
                .skip(skip)
                .limit(limitNum)
                .lean(),
            Users.countDocuments(filter),
        ]);

        // Calculate pagination info
        const totalPages = Math.ceil(totalCount / limitNum);
        const hasNextPage = pageNum < totalPages;
        const hasPrevPage = pageNum > 1;

        return {
            success: true,
            data: users,
            pagination: {
                currentPage: pageNum,
                totalPages,
                totalCount,
                hasNextPage,
                hasPrevPage,
                limit: limitNum,
            },
            meta: {
                searchTerm,
                adminsOnly: isAdminsOnly,
                sortField,
                order,
            },
        };
    } catch (error: any) {
        cliLogger.error(`Error fetching users list: ${error}`);

        // Re-throw createError instances
        if (error.statusCode) {
            throw error;
        }

        throw createError({
            statusCode: 500,
            statusMessage: "Failed to fetch users list",
        });
    }
});
