import { CharacterService } from "~/server/services";

export default defineCachedEventHandler(
    async () => {
        const count: number = await CharacterService.getTotalCount();
        return { count: count };
    },
    {
        maxAge: 3600,
        staleMaxAge: -1,
        swr: true,
        base: "redis",
        shouldBypassCache: (event) => {
            return process.env.NODE_ENV !== "production";
        },
        getKey: (event) => {
            return "characters:count";
        },
    }
);
