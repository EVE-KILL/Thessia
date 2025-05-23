import { createEmptyStats, ensureData } from "~/server/helpers/EmptyStats";
import { Stats } from "~/server/models/Stats";

export default defineCachedEventHandler(async (event) => {
    const characterId: number | null = event.context.params?.id
        ? Number.parseInt(event.context.params.id)
        : null;
    const query = getQuery(event);
    const days: number = query?.days ? Number.parseInt(query.days as string) : 0;

    if (!characterId) {
        return { error: "Character ID not provided" };
    }

    // Try to fetch from Stats model first
    const existingStats = await Stats.findOne({
        type: "character_id",
        id: characterId,
        days
    }).lean();

    // Return existing stats if found, otherwise return empty stats
    return ensureData(existingStats) || createEmptyStats("character_id", characterId, days);
}, {
    maxAge: 3600,
    staleMaxAge: -1,
    swr: true,
    base: "redis",
    getKey: (event) => {
        const idParam = event.context.params?.id;
        const query = getQuery(event);
        const days = query?.days ? query.days.toString() : '0';
        return `characters:${idParam}:shortstats:days:${days}`;
    },
    shouldBypassCache: (event) => {
        return process.env.NODE_ENV !== "production";
    }
});
