import { defineEventHandler } from "h3";
import { getFaction } from "~/server/helpers/ESIData";

export default defineEventHandler(async (event) => {
  const factionId: number | null = event.context.params?.id
    ? Number.parseInt(event.context.params.id)
    : null;
  if (!factionId) {
    return { error: "Faction ID not provided" };
  }

  const faction = await getFaction(factionId);
  return faction;
});
