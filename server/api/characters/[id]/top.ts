import { topRegions, topShips, topSystems } from "~/server/helpers/TopLists";

export default defineCachedEventHandler(async (event) => {
    const query = getQuery(event);
    const characterId: number | null = event.context.params?.id
        ? Number.parseInt(event.context.params.id)
        : null;
    const topType = (query.type as string) || "";
    if (!characterId) {
        return { error: "Character ID not provided" };
    }
    if (topType === "") {
        return { error: "Type not provided" };
    }

    switch (topType) {
        case "ships":
            return await topShips("character_id", characterId, 7, 10);

        case "systems":
            return await topSystems("character_id", characterId, 7, 10);

        case "regions":
            return await topRegions("character_id", characterId, 7, 10);
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
        return `characters:${idParam}:top:type:${type}`;
    },
    shouldBypassCache: (event) => {
        return process.env.NODE_ENV !== "production";
    },
});
