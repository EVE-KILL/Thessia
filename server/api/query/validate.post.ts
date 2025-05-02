// Validation API for query builder facets
import type { H3Event } from "h3";
import { Characters } from "~/server/models/Characters";
import { Constellations } from "~/server/models/Constellations";
import { Corporations } from "~/server/models/Corporations";
import { SolarSystems } from "~/server/models/SolarSystems";

export default defineEventHandler(async (event: H3Event) => {
    const body = await readBody(event);
    const facets = Array.isArray(body?.facets) ? body.facets : [];
    const warnings: string[] = [];

    // Helper to get value for a field from facets
    function getFacetValue(field: string) {
        const facet = facets.find((f: any) => f.field === field && f.value !== "" && f.value !== undefined);
        return facet ? facet.value : undefined;
    }

    // Location hierarchy checks
    const regionId = Number(getFacetValue("region_id"));
    const constellationId = Number(getFacetValue("constellation_id"));
    const systemId = Number(getFacetValue("system_id"));

    // Check system/region relationship
    if (regionId && systemId) {
        const system = await SolarSystems.findOne({ system_id: systemId });
        if (system && system.region_id !== regionId) {
            warnings.push("Selected system does not belong to the selected region.");
        }
    }

    // Check constellation/region relationship
    if (regionId && constellationId) {
        const constellation = await Constellations.findOne({ constellation_id: constellationId });
        if (constellation && constellation.region_id !== regionId) {
            warnings.push("Selected constellation does not belong to the selected region.");
        }
    }

    // Check system/constellation relationship
    if (constellationId && systemId) {
        const system = await SolarSystems.findOne({ system_id: systemId });
        if (system && system.constellation_id !== constellationId) {
            warnings.push("Selected system does not belong to the selected constellation.");
        }
    }

    // Organization hierarchy checks (victim)
    const victimAllianceId = Number(getFacetValue("victim.alliance_id"));
    const victimCorpId = Number(getFacetValue("victim.corporation_id"));
    const victimCharId = Number(getFacetValue("victim.character_id"));
    const victimFactionId = Number(getFacetValue("victim.faction_id"));

    if (victimAllianceId && victimCorpId) {
        const corp = await Corporations.findOne({ corporation_id: victimCorpId });
        if (corp && corp.alliance_id !== victimAllianceId) {
            warnings.push("Selected victim corporation does not belong to the selected alliance.");
        }
    }
    if (victimCorpId && victimCharId) {
        const char = await Characters.findOne({ character_id: victimCharId });
        if (char && char.corporation_id !== victimCorpId) {
            warnings.push("Selected victim character does not belong to the selected corporation.");
        }
    }
    if (victimFactionId && victimCorpId) {
        const corp = await Corporations.findOne({ corporation_id: victimCorpId });
        if (corp && corp.faction_id !== victimFactionId) {
            warnings.push("Selected victim corporation does not belong to the selected faction.");
        }
    }
    // Note: Alliance <-> Faction relationship check removed (no faction_id on alliance)

    // Organization hierarchy checks (attackers)
    const attackerAllianceId = Number(getFacetValue("attackers.alliance_id"));
    const attackerCorpId = Number(getFacetValue("attackers.corporation_id"));
    const attackerCharId = Number(getFacetValue("attackers.character_id"));
    const attackerFactionId = Number(getFacetValue("attackers.faction_id"));

    if (attackerAllianceId && attackerCorpId) {
        const corp = await Corporations.findOne({ corporation_id: attackerCorpId });
        if (corp && corp.alliance_id !== attackerAllianceId) {
            warnings.push("Selected attacker corporation does not belong to the selected alliance.");
        }
    }
    if (attackerCorpId && attackerCharId) {
        const char = await Characters.findOne({ character_id: attackerCharId });
        if (char && char.corporation_id !== attackerCorpId) {
            warnings.push("Selected attacker character does not belong to the selected corporation.");
        }
    }
    if (attackerFactionId && attackerCorpId) {
        const corp = await Corporations.findOne({ corporation_id: attackerCorpId });
        if (corp && corp.faction_id !== attackerFactionId) {
            warnings.push("Selected attacker corporation does not belong to the selected faction.");
        }
    }
    // Note: Alliance <-> Faction relationship check removed (no faction_id on alliance)

    // Return all warnings
    return { warnings };
});
