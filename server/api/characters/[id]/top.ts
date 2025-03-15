import { defineEventHandler } from "h3";
import { topRegions, topShips, topSystems } from "../../../helpers/TopLists";

export default defineEventHandler(async (event) => {
  const query = getQuery(event);
  const characterId: number | null = event.context.params?.id
    ? Number.parseInt(event.context.params.id)
    : null;
  const topType = (query.type as string) || "";
  if (!characterId) {
    return { error: "Character ID not provided" };
  }
  if (topType === "") {
    return { error: "Type not provided" };
  }

  switch (topType) {
    case "ships":
      return await topShips("character_id", characterId, 7, 10);

    case "systems":
      return await topSystems("character_id", characterId, 7, 10);

    case "regions":
      return await topRegions("character_id", characterId, 7, 10);
  }
});
