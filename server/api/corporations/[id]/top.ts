import { topRegions, topShips, topSystems } from '~/server/helpers/TopLists';

export default defineCachedEventHandler(async (event) => {
    const query = getQuery(event);
    const corporationId: number | null = event.context.params?.id
        ? Number.parseInt(event.context.params.id)
        : null;
    const topType = (query.type as string) || "";
    if (!corporationId) {
        return sendError(event, createError({ statusCode: 400, statusMessage: "Corporation ID not provided" }));
    }

    if (topType === "") {
        return sendError(event, createError({ statusCode: 400, statusMessage: "Type not provided" }));
    }

    switch (topType) {
        case "ships":
            return await topShips("corporation_id", corporationId, 7, 10);

        case "systems":
            return await topSystems("corporation_id", corporationId, 7, 10);

        case "regions":
            return await topRegions("corporation_id", corporationId, 7, 10);
    }
}, {
    maxAge: 3600,
    staleMaxAge: -1,
    swr: true,
    base: "redis",
    getKey: (event) => {
        const idParam = event.context.params?.id;
        const query = getQuery(event);
        const type = query.type?.toString() || "";
        return `corporations:${idParam}:top:type:${type}`;
    },
    shouldBypassCache: (event) => {
        return process.env.NODE_ENV !== "production";
    },
});
