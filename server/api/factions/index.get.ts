import { FactionService } from "../../services";

export default defineCachedEventHandler(
    async (event) => {
        const factions = await FactionService.findAll();
        // Return a single array containing all the IDs
        return factions.map((faction) => faction.faction_id);
    },
    {
        maxAge: 3600,
        staleMaxAge: -1,
        swr: true,
        base: "redis",
        getKey: (event) => {
            return `factions:index`;
        },
    }
);
