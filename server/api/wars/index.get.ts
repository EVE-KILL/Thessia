export default defineCachedEventHandler(async (event) => {
    const query = getQuery(event);
    const page = query?.page ? Number.parseInt(query.page as string) : 1;
    const wars = (
        await Wars.find({}, { war_id: 1 }, { limit: 100000, skip: (page - 1) * 100000 })
    ).map((war) => war.war_id);

    return wars;
}, {
    maxAge: 300,
    staleMaxAge: -1,
    swr: true,
    base: "redis",
    shouldBypassCache: (event) => {
        return process.env.NODE_ENV !== "production";
    },
    getKey: (event) => {
        const query = getQuery(event);
        const page = query?.page ? query.page.toString() : '1';
        return `wars:index:page:${page}`;
    }
});
