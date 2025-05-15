import { calculateShortStats } from "~/server/helpers/Stats";

export default defineCachedEventHandler(async (event) => {
    const characterId: number | null = event.context.params?.id
        ? Number.parseInt(event.context.params.id)
        : null;
    const query = getQuery(event);
    const days: number = query?.days ? Number.parseInt(query.days as string) : 0;
    if (!characterId) {
        return { error: "Character ID not provided" };
    }

    return calculateShortStats("character_id", characterId, days);
}, {
    maxAge: 3600,
    staleMaxAge: -1,
    swr: true,
    base: "redis"
});
