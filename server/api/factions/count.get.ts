import { FactionService } from "~/server/services";

export default defineCachedEventHandler(
    async (event) => {
        const count: number = await FactionService.getTotalCount();
        return { count: count };
    },
    {
        maxAge: 3600,
        staleMaxAge: -1,
        swr: true,
        base: "redis",
        getKey: (event) => {
            return "factions:count";
        },
    }
);
