import { KillmailService } from "~/server/services";

export default defineCachedEventHandler(
    async (event) => {
        const killmail_id = Number(event.context.params?.id);
        if (!killmail_id) {
            throw createError({
                statusCode: 400,
                statusMessage: "Invalid killmail id",
            });
        }

        const killmail = await KillmailService.findByIdWithFull(killmail_id);
        return killmail;
    },
    {
        maxAge: 300,
        staleMaxAge: -1,
        swr: true,
        base: "redis",
        getKey: (event) => {
            const idParam = event.context.params?.id;
            return `killmail:${idParam}:esi`;
        },
    }
);
