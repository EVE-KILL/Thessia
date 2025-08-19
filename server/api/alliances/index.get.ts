export default defineCachedEventHandler(
    async (event) => {
        const alliances: IAlliance[] = await Alliances.find(
            {},
            { alliance_id: 1 }
        );
        // Return a single array containing all the IDs
        return alliances.map((alliance) => alliance.alliance_id);
    },
    {
        maxAge: 3600,
        staleMaxAge: -1,
        swr: true,
        base: "redis",
        getKey: (event) => {
            // This endpoint does not use query parameters for filtering or pagination,
            // so a static key is sufficient.
            return "alliances:index:all";
        },
    }
);
