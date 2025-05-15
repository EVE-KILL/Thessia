import type { IKillmail } from "~/server/interfaces/IKillmail";
import { Killmails } from "~/server/models/Killmails";


export default defineCachedEventHandler(async (event) => {
    const latestKillmails: IKillmail[] = await Killmails.find(
        {},
        {
            _id: 0,
            killmail_id: 1,
            killmail_hash: 1,
        },
        {
            sort: { createdAt: -1 },
            limit: 10000,
        },
    ).hint("createdAt_-1");

    // Return { killmail_id: killmail_hash, ... }
    const killmails: { [key: string]: string } = {};
    for (const killmail of latestKillmails) {
        killmails[killmail.killmail_id] = killmail.killmail_hash;
    }

    return killmails;
}, {
    maxAge: 300,
    staleMaxAge: -1,
    swr: true,
    base: "redis",
    shouldBypassCache: (event) => {
        return process.env.NODE_ENV !== "production";
    },
    getKey: (event) => {
        return `killmail:latest`;
    }
});
