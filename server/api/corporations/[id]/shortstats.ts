import { calculateShortStats } from "~/server/helpers/Stats";

export default defineCachedEventHandler(async (event) => {
    const corporationId: number | null = event.context.params?.id
        ? Number.parseInt(event.context.params.id)
        : null;
    const query = getQuery(event);
    const days: number = query?.days ? Number.parseInt(query.days as string) : 0;
    if (!corporationId) {
        return sendError(event, createError({ statusCode: 400, statusMessage: "Missing corporation id" }));
    }

    try {
        // Default to 90 days for short stats
        const stats = await calculateShortStats("corporation_id", corporationId, days);
        return stats;
    } catch (error) {
        return sendError(event, createError({ statusCode: 500, statusMessage: "Failed to fetch corporation short stats" }));
    }
}, {
    maxAge: 3600,
    staleMaxAge: -1,
    swr: true,
    base: "redis",
    getKey: (event) => {
        const idParam = event.context.params?.id;
        const query = getQuery(event);
        const days = query?.days ? query.days.toString() : '0';
        return `corporations:${idParam}:shortstats:days:${days}`;
    },
    shouldBypassCache: (event) => {
        return process.env.NODE_ENV !== "production";
    },
});
