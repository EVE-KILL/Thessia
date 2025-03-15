import { defineEventHandler } from "h3";
import type { ICharacter } from "../../interfaces/ICharacter";

export default defineEventHandler(async (event) => {
  const query = getQuery(event);
  const page = query?.page ? Number.parseInt(query.page as string) : 1;
  const characters: ICharacter[] = await Characters.find(
    {},
    { character_id: 1 },
    { limit: 100000, skip: (page - 1) * 100000 },
  );

  // Return a single array containing all the IDs
  return characters.map((character) => character.character_id);
});
