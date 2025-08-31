import { Alliances } from "../../../../models/Alliances";
import { Characters } from "../../../../models/Characters";
import { Corporations } from "../../../../models/Corporations";
import { Factions } from "../../../../models/Factions";
import { Users } from "../../../../models/Users";

export default defineEventHandler(async (event) => {
    // Admin authentication check
    const cookie = getCookie(event, "evelogin");
    if (!cookie) {
        throw createError({
            statusCode: 401,
            statusMessage: "Authentication required",
        });
    }

    const user = await Users.findOne({ uniqueIdentifier: cookie });
    if (!(user as any)?.administrator) {
        throw createError({
            statusCode: 403,
            statusMessage: "Administrator privileges required",
        });
    }

    const characterId = parseInt(getRouterParam(event, "id") || "0");
    if (!characterId) {
        throw createError({
            statusCode: 400,
            statusMessage: "Invalid character ID",
        });
    }

    try {
        // Get full character data
        const character = await Characters.findOne({
            character_id: characterId,
        });

        if (!character) {
            throw createError({
                statusCode: 404,
                statusMessage: "Character not found",
            });
        }

        // Get related entity names for display
        let corporationName = null;
        let allianceName = null;
        let factionName = null;

        if (character.corporation_id) {
            const corporation = await Corporations.findOne({
                corporation_id: character.corporation_id,
            });
            corporationName = corporation?.name;
        }

        if (character.alliance_id) {
            const alliance = await Alliances.findOne({
                alliance_id: character.alliance_id,
            });
            allianceName = alliance?.name;
        }

        if (character.faction_id) {
            const faction = await Factions.findOne({
                faction_id: character.faction_id,
            });
            factionName = faction?.name;
        }

        return {
            character: character.toJSON(),
            names: {
                corporationName,
                allianceName,
                factionName,
            },
        };
    } catch (error: any) {
        console.error("Error fetching character details:", error);

        if (error.statusCode) {
            throw error;
        }

        throw createError({
            statusCode: 500,
            statusMessage: "Failed to fetch character details",
        });
    }
});
