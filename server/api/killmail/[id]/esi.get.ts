import type { IESIKillmail } from "~/server/interfaces/IESIKillmail";
import { KillmailsESI } from "~/server/models/KillmailsESI";

export default defineCachedEventHandler(
    async (event) => {
        const killmail_id = event.context.params?.id;
        const now = new Date();

        // Only return killmails that are not delayed or have passed their delay time
        const killmail: IESIKillmail | null = await KillmailsESI.findOne(
            {
                killmail_id: killmail_id,
                $or: [
                    { delayedUntil: { $exists: false } },
                    { delayedUntil: null },
                    { delayedUntil: { $lte: now } },
                ],
            },
            { _id: 0 }
        );

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
        shouldBypassCache: (event) => {
            return process.env.NODE_ENV !== "production";
        },
    }
);
