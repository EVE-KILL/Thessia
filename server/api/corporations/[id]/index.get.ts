import { getCorporation } from "../../../helpers/ESIData";
import { defineEventHandler } from 'h3';

export default defineEventHandler(async (event) => {
    const corporationId: number | null = event.context.params?.id ? parseInt(event.context.params.id) : null;
    if (!corporationId) {
        return { error: "Corporation ID not provided" };
    }

    const corporation = await getCorporation(corporationId);
    return corporation;
});
