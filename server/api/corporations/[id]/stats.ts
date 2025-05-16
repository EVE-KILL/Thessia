import { createEmptyStats } from "~/server/helpers/EmptyStats";
import { Stats } from "~/server/models/Stats";

export default defineCachedEventHandler(async (event) => {
    const corporationId: number | null = event.context.params?.id
        ? Number.parseInt(event.context.params.id)
        : null;
    const query = getQuery(event);
    const days: number = query?.days ? Number.parseInt(query.days as string) : 0;

    if (!corporationId) {
        return { error: "Corporation ID not provided" };
    }

    try {
        // Try to fetch from Stats model first
        const existingStats = await Stats.findOne({
            type: "corporation_id",
            id: corporationId,
            days
        }).lean();

        // Return existing stats if found, otherwise return empty stats
        return existingStats || createEmptyStats("corporation_id", corporationId, days);
    } catch (error: any) {
        console.error(`Error fetching corporation stats for ${corporationId}: ${error.message}`);
        // On error, still return empty stats instead of failing
        return createEmptyStats("corporation_id", corporationId, days);
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
        return `corporations:${idParam}:stats:days:${days}`;
    },
    shouldBypassCache: (event) => {
        return process.env.NODE_ENV !== "production";
    },
});
