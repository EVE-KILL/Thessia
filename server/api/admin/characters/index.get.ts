export default defineEventHandler(async (event) => {
    // Add cache-control headers to prevent caching
    setResponseHeaders(event, {
        "Cache-Control": "no-cache, no-store, must-revalidate",
        Pragma: "no-cache",
        Expires: "0",
    });

    // Get the cookie value using the hardcoded cookie name
    const cookieName = "evelogin";
    const cookie = getCookie(event, cookieName);

    if (!cookie) {
        throw createError({
            statusCode: 401,
            statusMessage: "Authentication required",
        });
    }

    // Find the user by uniqueIdentifier
    const user = await Users.findOne({ uniqueIdentifier: cookie });

    if (!user) {
        throw createError({
            statusCode: 401,
            statusMessage: "Invalid authentication",
        });
    }

    // Only allow administrators
    if (!user.administrator) {
        throw createError({
            statusCode: 403,
            statusMessage: "Access denied. Administrator privileges required.",
        });
    }

    try {
        const query = getQuery(event);
        const page = parseInt(query.page as string) || 1;
        const limit = Math.min(parseInt(query.limit as string) || 25, 100); // Cap at 100
        const search = (query.search as string) || "";

        // Build MongoDB filter with indexed fields
        const filter: any = {};

        // Handle search - use indexed fields for better performance
        if (search) {
            const searchNumber = parseInt(search);
            if (!isNaN(searchNumber)) {
                // If search is a number, search by character_id first (indexed)
                filter.character_id = searchNumber;
            } else {
                // Text search on name with regex (consider adding text index)
                filter.name = { $regex: search, $options: "i" };
            }
        }

        // Calculate pagination
        const skip = (page - 1) * limit;

        // Use aggregation pipeline for better performance
        const pipeline: any[] = [
            { $match: filter },
            {
                $facet: {
                    data: [
                        { $skip: skip },
                        { $limit: limit },
                        {
                            $project: {
                                character_id: 1,
                                name: 1,
                                corporation_id: 1,
                                corporation_name: 1,
                                alliance_id: 1,
                                alliance_name: 1,
                                faction_id: 1,
                                security_status: 1,
                                deleted: 1,
                                createdAt: 1,
                                updatedAt: 1,
                            },
                        },
                    ],
                },
            },
        ];

        const [result] = await Characters.aggregate(pipeline);

        const characters = result.data || [];

        // Use estimated document count for pagination calculation
        const estimatedTotal = await Characters.estimatedDocumentCount();

        // Calculate pagination info
        const totalPages = Math.ceil(estimatedTotal / limit);
        const hasNextPage = page < totalPages;
        const hasPrevPage = page > 1;

        return {
            characters,
            pagination: {
                currentPage: page,
                totalPages,
                hasNextPage,
                hasPrevPage,
                estimatedTotal,
            },
        };
    } catch (error) {
        console.error("Error fetching characters:", error);
        throw createError({
            statusCode: 500,
            statusMessage: "Internal server error",
        });
    }
});
