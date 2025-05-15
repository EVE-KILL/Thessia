import { defineEventHandler } from "h3";
import { getCharacter } from "~/server/helpers/ESIData";
import { Alliances } from "~/server/models/Alliances";
import { Bloodlines } from "~/server/models/Bloodlines";
import { Corporations } from "~/server/models/Corporations";
import { Races } from "~/server/models/Races";

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

    // Load the bloodline data
    const bloodline = await Bloodlines.findOne({ bloodline_id: character.bloodline_id });
    const race = await Races.findOne({ race_id: character.race_id });

    // Add the corporation and alliance names to the character object
    // And add in all the race and bloodline data
    const characterData = character.toObject ? character.toObject() : character;
    const enhancedCharacter = {
        ...characterData,
        corporation_name: corporation?.name || null,
        alliance_name: alliance?.name || null,
        bloodline_name: bloodline?.bloodline_name || null,
        bloodline_description: bloodline?.description || null,
        race_name: race?.race_name,
        race_description: race?.description
    };

    return enhancedCharacter;
});
