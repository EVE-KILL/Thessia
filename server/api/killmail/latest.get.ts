import { KillmailService } from "~/server/services";

export default defineCachedEventHandler(
    async (event) => {
        const latestKillmails = await KillmailService.findLatest(10000);

        // Return { killmail_id: killmail_hash, ... }
        const killmails: { [key: string]: string } = {};
        for (const killmail of latestKillmails) {
            killmails[killmail.killmail_id] = killmail.killmail_hash;
        }

        return killmails;
    },
    {
        maxAge: 300,
        staleMaxAge: -1,
        swr: true,
        base: "redis",
        getKey: (event) => {
            return `killmail:latest`;
        },
    }
);
