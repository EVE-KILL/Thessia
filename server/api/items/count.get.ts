import { TypeService } from "../../services";

export default defineCachedEventHandler(
    async (event) => {
        const count: number = await TypeService.count();
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
            return "items:count";
        },
    }
);
