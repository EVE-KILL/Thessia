import {
    AllianceService,
    CharacterService,
    CorporationService,
    FactionService,
} from "~/server/services";

export default defineCachedEventHandler(
    async (event) => {
        const allianceId: number | null = event.context.params?.id
            ? Number.parseInt(event.context.params.id)
            : null;
        if (!allianceId) {
            return { error: "Alliance ID not provided" };
        }

        const alliance = await AllianceService.findById(allianceId);
        if (!alliance) {
            return { error: "Alliance not found" };
        }

        // Add corporation_count and member_count
        const [corporation_count, member_count] = await Promise.all([
            CorporationService.countByAllianceId(allianceId),
            CharacterService.countByAllianceId(allianceId),
        ]);

        let faction = null;
        if (alliance.faction_id && alliance.faction_id > 0) {
            faction = await FactionService.findById(alliance.faction_id);
        }

        return {
            ...alliance,
            corporation_count,
            member_count,
            faction_name: faction?.name
                ? (faction.name as any)?.en || faction.name
                : null,
        };
    },
    {
        maxAge: 3600,
        staleMaxAge: -1,
        swr: true,
        base: "redis",
        getKey: (event) => {
            const idParam = event.context.params?.id;
            return `alliances:${idParam}`;
        },
    }
);
