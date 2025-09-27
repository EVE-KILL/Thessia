import { KillmailService } from "~/server/services";

export default defineCachedEventHandler(
    async () => {
        const count: number = await KillmailService.getTotalCount();
        return { count: count };
    },
    {
        maxAge: 300,
        staleMaxAge: -1,
        swr: true,
        base: "redis",
        getKey: (event) => {
            return "killmail:count";
        },
    }
);
