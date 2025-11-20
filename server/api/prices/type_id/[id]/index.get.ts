import { PriceService } from "~/server/services";

export default defineCachedEventHandler(
    async (event) => {
        const query = getQuery(event);
        const typeId = Number(event.context.params?.id);
        const days = new Date(
            Date.now() -
                1000 *
                    60 *
                    60 *
                    (Number.parseInt(query?.days as string) || 1) *
                    24
        );
        const dateQuery = query?.date;
        // dateQuery will be unixtime, it needs to be converted to a date object
        let date = dateQuery
            ? new Date(Number.parseInt(dateQuery as string) * 1000)
            : null;
        // If the date is going past 2003-10-01, set it to 2003-10-01
        if (date && date < new Date("2003-10-01")) {
            date = new Date("2003-10-01");
        }

        const prices = await PriceService.findByTypeSince(
            typeId,
            date || days,
            query?.regionId ? Number(query.regionId) : undefined
        );

        return prices.map((price) => ({
            ...price,
            average: price.average !== null ? Number(price.average) : null,
            highest: price.highest !== null ? Number(price.highest) : null,
            lowest: price.lowest !== null ? Number(price.lowest) : null,
            volume: price.volume !== null ? Number(price.volume) : null,
        }));
    },
    {
        maxAge: 300,
        staleMaxAge: -1,
        swr: true,
        base: "redis",
        getKey: (event) => {
            const typeId = (event as any).context.params?.id;
            const query = getQuery(event as any);
            const days = (query?.days as string) || "1";
            const dateQuery = query?.date as string;
            const regionId = (query?.regionId as string) || "all";
            return `prices:type_id:${typeId}:index:days:${days}:region:${regionId}:date:${dateQuery || "null"}`;
        },
    }
);
