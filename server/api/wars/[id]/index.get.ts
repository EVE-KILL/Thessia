export default defineCachedEventHandler(async (event) => {
    const warId = event.context.params?.id;
    const war = await Wars.findOne({ war_id: warId }, { _id: 0 });
    return war;
}, {
    maxAge: 300,
    staleMaxAge: -1,
    swr: true,
    base: "redis",
    shouldBypassCache: (event) => {
        return process.env.NODE_ENV !== "production";
    },
    getKey: (event) => {
        const warId = event.context.params?.id;
        return `wars:${warId}:index`;
    }
});
