import { defineEventHandler } from "h3";
import { getAlliance } from "~/server/helpers/ESIData";

export default defineEventHandler(async (event) => {
  const allianceId: number | null = event.context.params?.id
    ? Number.parseInt(event.context.params.id)
    : null;
  if (!allianceId) {
    return { error: "Alliance ID not provided" };
  }

  const alliance = await getAlliance(allianceId);
  return alliance;
});
