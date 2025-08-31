import { Corporations } from "../../../models/Corporations";
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
                // If search is a number, search by corporation_id first (indexed)
                filter.corporation_id = searchNumber;
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
                                corporation_id: 1,
                                name: 1,
                                ticker: 1,
                                alliance_id: 1,
                                alliance_name: 1,
                                ceo_id: 1,
                                member_count: 1,
                                tax_rate: 1,
                                deleted: 1,
                                createdAt: 1,
                                updatedAt: 1,
                            },
                        },
                    ],
                },
            },
        ];

        const [result] = await Corporations.aggregate(pipeline);

        const corporations = result.data || [];

        // Use estimated document count for pagination calculation
        const estimatedTotal = await Corporations.estimatedDocumentCount();

        // Calculate pagination info
        const totalPages = Math.ceil(estimatedTotal / limit);
        const hasNextPage = page < totalPages;
        const hasPrevPage = page > 1;

        return {
            corporations,
            pagination: {
                currentPage: page,
                totalPages,
                hasNextPage,
                hasPrevPage,
                estimatedTotal,
            },
        };
    } catch (error) {
        console.error("Error fetching corporations:", error);
        throw createError({
            statusCode: 500,
            statusMessage: "Internal server error",
        });
    }
});
