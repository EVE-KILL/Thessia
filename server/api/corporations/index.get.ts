export default defineCachedEventHandler(
    async (event) => {
        const query = getQuery(event);
        const page = query?.page ? Number.parseInt(query.page as string) : 1;
        const corporations: ICorporation[] = await Corporations.find(
            {},
            { corporation_id: 1 },
            { limit: 100000, skip: (page - 1) * 100000 }
        );
        // Return a single array containing all the IDs
        return corporations.map((corporation) => corporation.corporation_id);
    },
    {
        maxAge: 3600,
        staleMaxAge: -1,
        swr: true,
        base: "redis",
        shouldBypassCache: (event) => {
            return process.env.NODE_ENV !== "production";
        },
        getKey: (event) => {
            const query = getQuery(event);
            const page = query?.page ? query.page.toString() : "1";
            return `corporations:index:page:${page}`;
        },
    }
);
