import { defineEventHandler } from "h3";

export default defineEventHandler(async (event) => {
  const allianceId: number | null = event.context.params?.id
    ? Number.parseInt(event.context.params.id)
    : null;
  if (!allianceId) {
    return { error: "Alliance ID not provided" };
  }

  // Find all members that are in this corporation
  const members = await Characters.find(
    { alliance_id: allianceId },
    { _id: 0, character_id: 1, name: 1 },
  );
  if (members.length === 0) {
    return { error: "No members found" };
  }

  return members;
});
