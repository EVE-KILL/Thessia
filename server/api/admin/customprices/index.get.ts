export default defineEventHandler(async (event) => {
    await requireAdminAuth(event);

    const query = getQuery(event);
    const page = parseInt((query.page as string) || "1");
    const limit = parseInt((query.limit as string) || "25");
    const search = (query.search as string) || "";
    const sortBy = (query.sortBy as string) || "createdAt";
    const sortOrder = (query.sortOrder as string) || "desc";

    try {
        const skip = (page - 1) * limit;

        // Build search filter
        const filter: any = {};
        if (search) {
            // Search by type_id, price, or item name
            const searchNumber = parseFloat(search);
            const searchConditions: any[] = [];

            // Add numeric searches for type_id and price
            if (!isNaN(searchNumber)) {
                searchConditions.push(
                    { type_id: searchNumber },
                    { price: searchNumber }
                );
            }

            // Always add text search for item names (via lookup)
            // We'll use an aggregation pipeline to search item names
            filter.$or = searchConditions.length > 0 ? searchConditions : [{}];

            // For text search, we'll modify the aggregation pipeline
            filter._textSearch = search;
        }

        // Build sort object
        const sort: any = {};
        sort[sortBy] = sortOrder === "desc" ? -1 : 1;

        // Execute queries with aggregation to include item data
        const pipeline: any[] = [
            { $match: filter.$or ? { $or: filter.$or } : {} },
            {
                $lookup: {
                    from: "invTypes",
                    localField: "type_id",
                    foreignField: "type_id",
                    as: "itemData",
                },
            },
            {
                $addFields: {
                    itemName: { $arrayElemAt: ["$itemData.name.en", 0] },
                },
            },
        ];

        // Add text search if needed
        if (filter._textSearch && !filter.$or) {
            pipeline.push({
                $match: {
                    itemName: { $regex: filter._textSearch, $options: "i" },
                },
            });
        } else if (filter._textSearch && filter.$or) {
            // Combine numeric and text search
            pipeline.push({
                $match: {
                    $or: [
                        ...filter.$or,
                        {
                            itemName: {
                                $regex: filter._textSearch,
                                $options: "i",
                            },
                        },
                    ],
                },
            });
        }

        pipeline.push(
            { $sort: sort },
            { $skip: skip },
            { $limit: limit },
            {
                $project: {
                    type_id: 1,
                    price: 1,
                    date: 1,
                    createdAt: 1,
                    updatedAt: 1,
                    itemName: 1,
                },
            }
        );

        const [customPricesResult, totalCount] = await Promise.all([
            CustomPrices.aggregate(pipeline),
            // For count, we need a simpler aggregation without skip/limit
            CustomPrices.aggregate([
                { $match: filter.$or ? { $or: filter.$or } : {} },
                {
                    $lookup: {
                        from: "invTypes",
                        localField: "type_id",
                        foreignField: "type_id",
                        as: "itemData",
                    },
                },
                {
                    $addFields: {
                        itemName: { $arrayElemAt: ["$itemData.name.en", 0] },
                    },
                },
                ...(filter._textSearch && !filter.$or
                    ? [
                          {
                              $match: {
                                  itemName: {
                                      $regex: filter._textSearch,
                                      $options: "i",
                                  },
                              },
                          },
                      ]
                    : []),
                ...(filter._textSearch && filter.$or
                    ? [
                          {
                              $match: {
                                  $or: [
                                      ...filter.$or,
                                      {
                                          itemName: {
                                              $regex: filter._textSearch,
                                              $options: "i",
                                          },
                                      },
                                  ],
                              },
                          },
                      ]
                    : []),
                { $count: "total" },
            ]).then((result) => (result.length > 0 ? result[0].total : 0)),
        ]);

        const customPrices = customPricesResult;

        // Calculate pagination info
        const totalPages = Math.ceil(totalCount / limit);
        const hasNextPage = page < totalPages;
        const hasPrevPage = page > 1;

        return {
            success: true,
            data: customPrices,
            pagination: {
                currentPage: page,
                totalPages,
                totalCount,
                hasNextPage,
                hasPrevPage,
                limit,
            },
        };
    } catch (error) {
        console.error("Error fetching custom prices:", error);
        throw createError({
            statusCode: 500,
            statusMessage: "Failed to fetch custom prices",
        });
    }
});
