export default defineCachedEventHandler(
    async (event) => {
        const killmail_id = event.context.params?.id;

        const killmail: IKillmail | null = await Killmails.findOne(
            { killmail_id: killmail_id },
            { _id: 0 }
        );
        const capsuleIds = [670, 33328];

        // If the victim ship_id isn't a capsule, we can't find siblings
        if (!killmail?.victim?.ship_id) {
            return [];
        }

        const victimCharacterId = killmail?.victim?.character_id;
        const systemId = killmail?.system_id;
        const unixTime = Math.floor(Number(killmail?.kill_time));
        const killTimeStart = new Date(unixTime - 3600 * 1000);
        const killTimeEnd = new Date(unixTime + 3600 * 1000);

        const query = {
            "victim.character_id": victimCharacterId,
            "victim.ship_id": { $ne: killmail?.victim?.ship_id },
            system_id: systemId,
            kill_time: { $gte: killTimeStart, $lt: killTimeEnd },
            killmail_id: { $ne: killmail_id },
        };

        // Find all sibling killmails within the time window
        const siblings = await Killmails.find(
            query,
            {
                _id: 0,
                killmail_id: 1,
                "victim.ship_id": 1,
                "victim.ship_name": 1,
            },
            { sort: { kill_time: -1 } }
        );
        if (!siblings || siblings.length === 0) {
            return [];
        }
        // Return array of sibling objects
        return siblings.map((k) => ({
            killmail_id: k.killmail_id,
            victim: {
                ship_id: k.victim.ship_id,
                ship_name: k.victim.ship_name,
            },
        }));
    },
    {
        maxAge: 300,
        staleMaxAge: -1,
        swr: true,
        getKey: (event) => {
            const idParam = event.context.params?.id;
            return `killmail:${idParam}:sibling`;
        },
    }
);
