export default defineCachedEventHandler(
    async (event) => {
        const count: number = await Factions.estimatedDocumentCount();
        return { count: count };
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
            return "factions:count";
        },
    }
);
