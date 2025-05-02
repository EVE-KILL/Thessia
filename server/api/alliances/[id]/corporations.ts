import { defineEventHandler } from "h3";
import { Corporations } from "~/server/models/Corporations";

export default defineEventHandler(async (event) => {
    const allianceId: number | null = event.context.params?.id
        ? Number.parseInt(event.context.params.id)
        : null;
    if (!allianceId) {
        return { error: "Alliance ID not provided" };
    }

    // Find all corporations that are in this alliance
    const corporations = await Corporations.find(
        { alliance_id: allianceId },
        { _id: 0, corporation_id: 1, name: 1 },
    );
    if (corporations.length === 0) {
        return { error: "No corporations found" };
    }

    return corporations;
});
