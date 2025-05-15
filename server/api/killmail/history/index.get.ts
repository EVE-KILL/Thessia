export default defineCachedEventHandler(async (event) => {
    const dateCounts = await Killmails.aggregate([
        {
            $group: {
                _id: { $dateToString: { format: "%Y-%m-%d", date: "$kill_time" } },
                count: { $sum: 1 },
            },
        },
        { $sort: { _id: 1 } },
    ]);

    const result: { [key: string]: number } = {};
    for (const entry of dateCounts) {
        result[entry._id] = entry.count;
    }

    return result;
}, {
    maxAge: 300,
    staleMaxAge: -1,
    swr: true,
    base: "redis",
    shouldBypassCache: (event) => {
        return process.env.NODE_ENV !== "production";
    },
    getKey: (event) => {
        // This endpoint currently does not use query parameters for filtering,
        // but a basic key is provided for caching purposes.
        // If query parameters are added in the future (e.g., startDate, endDate),
        // they should be included in the key to ensure unique caching.
        return `killmail:history:all`;
    }
});
