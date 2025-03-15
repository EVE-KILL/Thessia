import { defineEventHandler } from "h3";

export default defineEventHandler(async (event) => {
  const corporationId: number | null = event.context.params?.id
    ? Number.parseInt(event.context.params.id)
    : null;
  if (!corporationId) {
    return { error: "Corporation ID not provided" };
  }

  // Find all members that are in this corporation
  const members = await Characters.find(
    { corporation_id: corporationId },
    { _id: 0, character_id: 1, name: 1 },
  );
  if (members.length === 0) {
    return { error: "No members found" };
  }

  return members;
});
