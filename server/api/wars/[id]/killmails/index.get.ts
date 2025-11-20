import prisma from "~/lib/prisma";

export default defineCachedEventHandler(
    async (event) => {
        const warId = Number(event.context.params?.id);
        if (!warId) {
            throw createError({
                statusCode: 400,
                statusMessage: "War ID is required",
            });
        }

        const killmails = await prisma.killmail.findMany({
            where: { war_id: warId },
            select: {
                killmail_id: true,
                killmail_hash: true,
            },
        });

        return killmails;
    },
    {
        maxAge: 300,
        staleMaxAge: -1,
        swr: true,
        base: "redis",
        getKey: (event) => {
            const warId = event.context.params?.id;
            return `wars:${warId}:killmails:index`;
        },
    }
);
