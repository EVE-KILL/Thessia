import { AllianceService, CorporationService, FactionService } from "~/server/services";
import { getCharacter } from "../../../helpers/ESIData";

export default defineCachedEventHandler(
    async (event) => {
        const corporationId: number | null = event.context.params?.id
            ? Number.parseInt(event.context.params.id)
            : null;
        if (!corporationId) {
            return { error: "Corporation ID not provided" };
        }

        const corporation = await CorporationService.findById(corporationId);
        if (!corporation) {
            return { error: "Corporation not found" };
        }
        let alliance = null;

        if ((corporation.alliance_id ?? 0) > 0) {
            alliance = await AllianceService.findById(corporation.alliance_id!);
        }
        let faction = null;
        if ((corporation.faction_id ?? 0) > 0) {
            faction = await FactionService.findById(corporation.faction_id!);
        }

        // Fetch CEO name if ceo_id is available
        let ceoName = null;
        if (corporation.ceo_id && corporation.ceo_id > 0) {
            try {
                const ceoData = await getCharacter(corporation.ceo_id);
                ceoName = ceoData?.name || null;
            } catch (error) {
                console.warn(
                    `Failed to fetch CEO data for corporation ${corporationId}:`,
                    error
                );
                ceoName = null;
            }
        }

        const enhancedCorporation = {
            ...corporation,
            alliance_name: alliance?.name || null,
            faction_name: faction?.name || null,
            ceo_name: ceoName,
        };

        return enhancedCorporation;
    },
    {
        maxAge: 3600,
        staleMaxAge: -1,
        swr: true,
        base: "redis",
        getKey: (event) => {
            const idParam = event.context.params?.id;
            // No query parameters are used in this handler, so only include the id and the endpoint suffix.
            return `corporations:${idParam}:index`;
        },
    }
);
