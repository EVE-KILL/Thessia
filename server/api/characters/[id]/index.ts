import { getCharacter } from "../../../helpers/ESIData";
import { defineEventHandler } from 'h3';

export default defineEventHandler(async (event) => {
    const characterId: number | null = event.context.params?.id ? parseInt(event.context.params.id) : null;
    if (!characterId) {
        return { error: "Character ID not provided" };
    }

    const character = await getCharacter(characterId);
    return character;
});
