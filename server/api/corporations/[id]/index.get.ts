import { defineEventHandler } from "h3";
import { getCorporation } from "~/server/helpers/ESIData";

export default defineEventHandler(async (event) => {
  const corporationId: number | null = event.context.params?.id
    ? Number.parseInt(event.context.params.id)
    : null;
  if (!corporationId) {
    return { error: "Corporation ID not provided" };
  }

  const corporation = await getCorporation(corporationId);
  return corporation;
});
