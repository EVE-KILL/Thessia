import { Alliances } from "../../../models/Alliances";
import { Users } from "../../../models/Users";

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
                // If search is a number, search by alliance_id first (indexed)
                filter.alliance_id = searchNumber;
            } else {
                // Text search - check if it could be a ticker or name
                filter.$or = [
                    { name: { $regex: search, $options: "i" } },
                    { ticker: { $regex: search, $options: "i" } },
                ];
            }
        }

        // Calculate pagination
        const skip = (page - 1) * limit;

        // Use aggregation pipeline for better performance with large datasets
        const pipeline: any[] = [
            { $match: filter },
            { $sort: { updatedAt: -1 } },
            {
                $facet: {
                    data: [
                        { $skip: skip },
                        { $limit: limit },
                        {
                            $project: {
                                alliance_id: 1,
                                name: 1,
                                ticker: 1,
                                executor_corporation_id: 1,
                                creator_id: 1,
                                creator_corporation_id: 1,
                                date_founded: 1,
                                deleted: 1,
                                createdAt: 1,
                                updatedAt: 1,
                            },
                        },
                    ],
                },
            },
        ];

        const [result] = await Alliances.aggregate(pipeline);

        const alliances = result.data || [];

        // For pagination calculations, we need the total count for the current filter
        let totalCount;

        if (search) {
            // If there's a search filter, we need to count matching documents
            const countResult = await Alliances.aggregate([
                { $match: filter },
                { $count: "total" },
            ]);
            totalCount = countResult[0]?.total || 0;
        } else {
            // For non-search queries, use estimated document count for better performance
            totalCount = await Alliances.estimatedDocumentCount();
        }

        // Calculate pagination info
        const totalPages = Math.ceil(totalCount / limit);
        const hasNextPage = page < totalPages;
        const hasPrevPage = page > 1;

        return {
            alliances,
            pagination: {
                currentPage: page,
                totalPages,
                hasNextPage,
                hasPrevPage,
                totalCount,
            },
        };
    } catch (error) {
        console.error("Error fetching alliances:", error);
        throw createError({
            statusCode: 500,
            statusMessage: "Internal Server Error",
        });
    }
});
