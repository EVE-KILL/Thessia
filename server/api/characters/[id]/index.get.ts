import { defineEventHandler } from "h3";
import { getCharacter } from "~/server/helpers/ESIData";

export default defineEventHandler(async (event) => {
  const characterId: number | null = event.context.params?.id
    ? Number.parseInt(event.context.params.id)
    : null;
  if (!characterId) {
    return { error: "Character ID not provided" };
  }

  const character = await getCharacter(characterId);
  return character;
});
