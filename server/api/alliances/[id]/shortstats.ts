import { createEmptyStats } from "~/server/helpers/EmptyStats";
import { Stats } from "~/server/models/Stats";

export default defineCachedEventHandler(async (event) => {
    const allianceId: number | null = event.context.params?.id
        ? Number.parseInt(event.context.params.id)
        : null;
    const query = getQuery(event);
    const days: number = query?.days ? Number.parseInt(query.days as string) : 0;

    if (!allianceId) {
        return sendError(event, createError({ statusCode: 400, statusMessage: "Missing alliance id" }));
    }

    try {
        // Try to fetch from Stats model first
        const existingStats = await Stats.findOne({
            type: "alliance_id",
            id: allianceId,
            days
        }).lean();

        // Return existing stats if found, otherwise return empty stats
        return existingStats || createEmptyStats("alliance_id", allianceId, days);
    } catch (error: any) {
        console.error(`Error fetching alliance shortstats for ${allianceId}: ${error.message}`);
        // On error, still return empty stats instead of failing
        return createEmptyStats("alliance_id", allianceId, days);
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
        return `alliances:${idParam}:shortstats:days:${days}`;
    },
    shouldBypassCache: (event) => {
        return process.env.NODE_ENV !== "production";
    },
});
