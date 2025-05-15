import type { IFaction } from "~/server/interfaces/IFaction";

export default defineCachedEventHandler(async (event) => {
    const factions: IFaction[] = await Factions.find({}, { faction_id: 1 });
    // Return a single array containing all the IDs
    return factions.map((faction) => faction.faction_id);
}, {
    maxAge: 3600,
    staleMaxAge: -1,
    swr: true,
    base: "redis",
    shouldBypassCache: (event) => {
        return process.env.NODE_ENV !== "production";
    },
    getKey: (event) => {
        return `factions:index`;
    }
});
