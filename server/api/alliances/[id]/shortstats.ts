import type { H3Event } from "h3";
import { sendError } from "h3";
import { calculateShortStats } from "~/server/helpers/Stats";

export default defineCachedEventHandler(async (event: H3Event) => {
    const allianceId: number | null = event.context.params?.id
        ? Number.parseInt(event.context.params.id)
        : null;
    const query = getQuery(event);
    const days: number = query?.days ? Number.parseInt(query.days as string) : 0;
    if (!allianceId) {
        return sendError(event, createError({ statusCode: 400, statusMessage: "Missing alliance id" }));
    }

    try {
        // Default to 90 days for short stats
        const stats = await calculateShortStats("alliance_id", allianceId, days);
        return stats;
    } catch (error) {
        return sendError(event, createError({ statusCode: 500, statusMessage: "Failed to fetch alliance short stats" }));
    }
}, {
    maxAge: 3600,
    staleMaxAge: -1,
    swr: true,
    base: "redis"
});
