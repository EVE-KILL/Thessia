import { getFaction } from "../../../helpers/ESIData";
import { defineEventHandler } from 'h3';

export default defineEventHandler(async (event) => {
    const factionId: number | null = event.context.params?.id ? parseInt(event.context.params.id) : null;
    if (!factionId) {
        return { error: "Faction ID not provided" };
    }

    const faction = await getFaction(factionId);
    return faction;
});
