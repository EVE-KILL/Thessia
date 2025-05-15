import { defineEventHandler } from "h3";
import { getCorporation } from "~/server/helpers/ESIData";
import { Alliances } from "~/server/models/Alliances";
import { Factions } from "~/server/models/Factions";

export default defineCachedEventHandler(async (event) => {
    const corporationId: number | null = event.context.params?.id
        ? Number.parseInt(event.context.params.id)
        : null;
    if (!corporationId) {
        return { error: "Corporation ID not provided" };
    }

    const corporation = await getCorporation(corporationId);
    let alliance = null;

    if (corporation.alliance_id > 0) {
        alliance = await Alliances.findOne({ alliance_id: corporation.alliance_id });
    }
    let faction = null;
    if (corporation.faction_id > 0) {
        faction = await Factions.findOne({ faction_id: corporation.faction_id });
    }

    const corporationData = corporation.toObject ? corporation.toObject() : corporation;
    const enhancedCorporation = {
        ...corporationData,
        alliance_name: alliance?.name || null,
        faction_name: faction?.name || null,
    }

    return enhancedCorporation;
}, {
    maxAge: 3600,
    staleMaxAge: -1,
    swr: true,
    base: "redis"
});
