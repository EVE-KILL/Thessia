import { getCachedPriceAggregation } from "../../helpers/RuntimeCache";

export default defineCachedEventHandler(
    async (event) => {
        const result = await getCachedPriceAggregation();

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
        base: "redis",
        getKey: (event) => {
            // This endpoint does not use query parameters for filtering or pagination.
            return `prices:index:all`;
        },
    }
);
