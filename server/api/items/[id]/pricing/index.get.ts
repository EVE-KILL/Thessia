export default defineCachedEventHandler(async (event) => {
    const query = getQuery(event as any);
    const typeId: number | null = event.context.params?.id
        ? Number.parseInt(event.context.params.id)
        : null;
    const regionId = query.regionId ? Number.parseInt(query.regionId as string) : 10000002;
    const days = query.days ? Number.parseInt(query.days as string) : 7;
    if (!typeId) {
        return { error: "Type ID not provided" };
    }

    return Prices.find(
        {
            type_id: typeId,
            region_id: regionId,
            date: { $gte: new Date(Date.now() - days * 24 * 60 * 60 * 1000) },
        },
        {
            _id: 0,
        },
    ).sort({ date: -1 });
}, {
    maxAge: 300,
    staleMaxAge: -1,
    swr: true,
    base: "redis",
    shouldBypassCache: (event) => {
        return process.env.NODE_ENV !== "production";
    },
    getKey: (event) => {
        const typeId = event.context.params?.id;
        const query = getQuery(event as any);
        const regionId = query.regionId;
        const days = query.days;
        return `items:${typeId}:pricing:${regionId}:${days}`;
    }
});
