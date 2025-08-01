export default defineCachedEventHandler(
    async (event) => {
        const corporationId: number | null = event.context.params?.id
            ? Number.parseInt(event.context.params.id)
            : null;
        if (!corporationId) {
            return { error: "Corporation ID not provided" };
        }

        const corporation = await getCorporation(corporationId);
        let alliance = null;

        if ((corporation.alliance_id ?? 0) > 0) {
            alliance = await Alliances.findOne({
                alliance_id: corporation.alliance_id,
            });
        }
        let faction = null;
        if ((corporation.faction_id ?? 0) > 0) {
            faction = await Factions.findOne({
                faction_id: corporation.faction_id,
            });
        }

        const corporationData = (corporation as any).toObject
            ? (corporation as any).toObject()
            : corporation;
        const enhancedCorporation = {
            ...corporationData,
            alliance_name: alliance?.name || null,
            faction_name: faction?.name || null,
        };

        return enhancedCorporation;
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
            const idParam = event.context.params?.id;
            // No query parameters are used in this handler, so only include the id and the endpoint suffix.
            return `corporations:${idParam}:index`;
        },
    }
);
