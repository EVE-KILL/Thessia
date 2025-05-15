
export default defineCachedEventHandler(async (event) => {
    return InvTypes.find(
        { published: true },
        {
            _id: 0,
            type_id: 1,
            name: 1,
            group_id: 1,
        },
    );
}, {
    maxAge: 3600,
    staleMaxAge: -1,
    swr: true,
    base: "redis",
    shouldBypassCache: (event) => {
        return process.env.NODE_ENV !== "production";
    },
    getKey: (event) => {
        // No query parameters are used in this endpoint, so a static key is sufficient.
        return `items:index:all`;
    }
});
