import { WarService } from "~/server/services";

export default defineCachedEventHandler(
    async (event) => {
        const warId = event.context.params?.id;
        if (!warId) {
            throw createError({
                statusCode: 400,
                statusMessage: "War ID is required",
            });
        }

        const war = await WarService.findById(parseInt(warId));
        if (!war) {
            throw createError({
                statusCode: 404,
                statusMessage: "War not found",
            });
        }

        return war;
    },
    {
        maxAge: 300,
        staleMaxAge: -1,
        swr: true,
        base: "redis",
        shouldBypassCache: (event) => {
            return process.env.NODE_ENV !== "production";
        },
        getKey: (event) => {
            const warId = event.context.params?.id;
            return `wars:${warId}:index`;
        },
    }
);
