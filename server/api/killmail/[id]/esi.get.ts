import type { IESIKillmail } from "~/server/interfaces/IESIKillmail";
import { KillmailsESI } from "~/server/models/KillmailsESI";

export default defineCachedEventHandler(async (event) => {
    const killmail_id = event.context.params?.id;
    const killmail: IESIKillmail | null = await KillmailsESI.findOne(
        { killmail_id: killmail_id },
        { _id: 0 },
    );

    return killmail;
}, {
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
});
