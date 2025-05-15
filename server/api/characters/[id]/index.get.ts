import { defineEventHandler } from "h3";
import { getCharacter } from "~/server/helpers/ESIData";
import { Alliances } from "~/server/models/Alliances";
import { Corporations } from "~/server/models/Corporations";

export default defineEventHandler(async (event) => {
    const characterId: number | null = event.context.params?.id
        ? Number.parseInt(event.context.params.id)
        : null;
    if (!characterId) {
        return { error: "Character ID not provided" };
    }

    const character = await getCharacter(characterId);

    // Add corporation and alliance names
    const corporation = await Corporations.findOne({ corporation_id: character.corporation_id });
    let alliance = null;
    if (character?.alliance_id > 0) {
        alliance = await Alliances.findOne({ alliance_id: character.alliance_id });
    }
    const characterData = character.toObject ? character.toObject() : character;
    const enhancedCharacter = {
        ...characterData,
        corporation_name: corporation?.name || null,
        alliance_name: alliance?.name || null
    };

    return enhancedCharacter;
});
