import { getAlliance } from "~/server/helpers/ESIData";
import { Characters } from "~/server/models/Characters";
import { Corporations } from "~/server/models/Corporations";
import { Factions } from "~/server/models/Factions";

export default defineCachedEventHandler(async (event) => {
    const allianceId: number | null = event.context.params?.id
        ? Number.parseInt(event.context.params.id)
        : null;
    if (!allianceId) {
        return { error: "Alliance ID not provided" };
    }

    const allianceRaw = await getAlliance(allianceId);
    // If the result is a Mongoose document, convert to plain object
    const alliance =
        allianceRaw && typeof (allianceRaw as any).toObject === "function"
            ? (allianceRaw as any).toObject()
            : allianceRaw;

    // Add corporation_count and member_count
    const [corporation_count, member_count] = await Promise.all([
        Corporations.countDocuments({ alliance_id: allianceId }),
        Characters.countDocuments({ alliance_id: allianceId }),
    ]);

    let faction = null;
    if (alliance?.faction_id > 0) {
        faction = await Factions.findOne({ faction_id: alliance.faction_id });
    }

    return {
        ...alliance,
        corporation_count,
        member_count,
        faction_name: faction?.name || null
    };
}, {
    maxAge: 3600,
    staleMaxAge: -1,
    swr: true,
    base: "redis",
    shouldBypassCache: (event) => {
        return process.env.NODE_ENV !== "production";
    },
    getKey: (event) => {
        const idParam = event.context.params?.id;
        return `alliances:${idParam}`;
    }
});
