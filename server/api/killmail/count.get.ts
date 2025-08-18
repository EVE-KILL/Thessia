export default defineCachedEventHandler(
    async () => {
        const count: number = await Killmails.estimatedDocumentCount();
        return { count: count };
    },
    {
        maxAge: 300,
        staleMaxAge: -1,
        swr: true,
        shouldBypassCache: (event) => {
            return process.env.NODE_ENV !== "production";
        },
        getKey: (event) => {
            return "killmail:count";
        },
    }
);
