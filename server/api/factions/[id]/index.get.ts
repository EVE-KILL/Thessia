import { FactionService } from "~/server/services";

export default defineCachedEventHandler(
    async (event) => {
        const factionId: number | null = event.context.params?.id
            ? Number.parseInt(event.context.params.id)
            : null;
        if (!factionId) {
            return { error: "Faction ID not provided" };
        }

        const faction = await FactionService.findById(factionId);
        if (!faction) {
            return { error: "Faction not found" };
        }
        return faction;
    },
    {
        maxAge: 3600,
        staleMaxAge: -1,
        swr: true,
        base: "redis",
        getKey: (event) => {
            const factionId = event.context.params?.id;
            if (!factionId) {
                return "factions:invalid:index";
            }
            return `factions:${factionId}:index`;
        },
    }
);
