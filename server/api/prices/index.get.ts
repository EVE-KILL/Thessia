export default defineCachedEventHandler(
    async (event) => {
        const pipeline = [
            {
                $group: {
                    _id: {
                        $dateToString: { format: "%Y-%m-%d", date: "$date" },
                    },
                    count: { $sum: 1 },
                },
            },
            {
                $sort: { _id: -1 as const },
            },
        ];

        const result = await Prices.aggregate(pipeline).exec();

        // Transform the result to the desired format
        const formattedResult = result.reduce((acc, item) => {
            acc[item._id] = item.count;
            return acc;
        }, {});

        return formattedResult;
    },
    {
        maxAge: 300,
        staleMaxAge: -1,
        swr: true,
        shouldBypassCache: (event) => {
            return process.env.NODE_ENV !== "production";
        },
        getKey: (event) => {
            // This endpoint does not use query parameters for filtering or pagination.
            return `prices:index:all`;
        },
    }
);
