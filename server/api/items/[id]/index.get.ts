export default defineCachedEventHandler(async (event) => {
    const typeId: number | null = event.context.params?.id
        ? Number.parseInt(event.context.params.id)
        : null;
    if (!typeId) {
        return { error: "Type ID not provided" };
    }

    return InvTypes.findOne(
        { type_id: typeId },
        {
            _id: 0,
            dogma_attributes: 0,
            dogma_effects: 0,
            createdAt: 0,
            updatedAt: 0,
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
        const typeId = event.context.params?.id;
        return `items:${typeId ?? 'undefined'}:index`;
    }
});
