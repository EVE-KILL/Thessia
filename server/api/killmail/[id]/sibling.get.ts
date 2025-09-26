import { KillmailService } from "~/server/services";

export default defineCachedEventHandler(
    async (event) => {
        const killmail_id = event.context.params?.id;

        const killmail = await KillmailService.findByIdWithFull(Number(killmail_id));
        const capsuleIds = [670, 33328];

        // If the victim ship_type_id isn't a capsule, we can't find siblings
        if (!killmail?.victim?.ship_type_id) {
            return [];
        }

        const victimCharacterId = killmail?.victim?.character_id;
        const systemId = killmail?.solar_system_id;
        const unixTime = Math.floor(Number(killmail?.killmail_time));
        const killTimeStart = new Date(unixTime - 3600 * 1000);
        const killTimeEnd = new Date(unixTime + 3600 * 1000);

        // Find all sibling killmails within the time window
        const siblings = await KillmailService.findSiblings(
            victimCharacterId!,
            Number(killmail_id),
            killmail.victim.ship_type_id,
            systemId!,
            killTimeStart,
            killTimeEnd
        );

        if (!siblings || siblings.length === 0) {
            return [];
        }

        // Return array of sibling objects
        return siblings.map((k) => ({
            killmail_id: k.killmail_id,
            victim: {
                ship_id: k.victim?.ship_type_id || 0,
                ship_name: k.victim?.ship_type?.name || null,
            },
        }));
    },
    {
        maxAge: 300,
        staleMaxAge: -1,
        swr: true,
        base: "redis",
        getKey: (event) => {
            const idParam = event.context.params?.id;
            return `killmail:${idParam}:sibling`;
        },
    }
);
