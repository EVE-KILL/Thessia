export default defineCachedEventHandler(
    async (event) => {
        const count: number = await Factions.estimatedDocumentCount();
        return { count: count };
    },
    {
        maxAge: 3600,
        staleMaxAge: -1,
        swr: true,
        getKey: (event) => {
            return "factions:count";
        },
    }
);
