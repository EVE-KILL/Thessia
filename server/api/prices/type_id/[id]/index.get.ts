export default defineCachedEventHandler(
    async (event) => {
        const query = getQuery(event);
        const typeId = event.context.params?.id;
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

        const mongoQuery = {
            type_id: typeId,
            date: { $gte: date || days },
        };

        const prices: IPrice[] = await Prices.find(mongoQuery, {
            _id: 0,
            __v: 0,
            createdAt: 0,
            updatedAt: 0,
        });

        return prices;
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
            return `prices:type_id:${typeId}:index:days:${days}:date:${
                dateQuery || "null"
            }`;
        },
        shouldBypassCache: (event) => {
            return process.env.NODE_ENV !== "production";
        },
    }
);
