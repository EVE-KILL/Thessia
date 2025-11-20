import { PriceService } from "~/server/services";

export default defineCachedEventHandler(
    async (event) => {
        const result = await PriceService.getDailyAggregation();

        // Transform the result to the desired format
        const formattedResult = result.reduce((acc, item) => {
            acc[item.day] = item.count;
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
