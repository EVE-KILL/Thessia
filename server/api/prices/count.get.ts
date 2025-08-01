export default defineCachedEventHandler(
    async (event) => {
        const count: number = await Prices.estimatedDocumentCount();
        return { count: count };
    },
    {
        maxAge: 300, // Use the maxAge from nuxt.config.ts
        staleMaxAge: -1,
        swr: true,
        base: "redis", // As specified in nuxt.config.ts
        shouldBypassCache: (event) => {
            return process.env.NODE_ENV !== "production";
        },
        getKey: (event) => {
            // Construct a unique key for this endpoint.
            // For `server/api/prices/count.get.ts`, if it takes no parameters,
            // a static key like "prices:count" would be appropriate.
            // If it takes query parameters, include them in the key.
            return "prices:count"; // Adjust if parameters are used
        },
    }
);
