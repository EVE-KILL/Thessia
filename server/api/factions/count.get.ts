import { defineEventHandler } from "h3";

export default defineEventHandler(async () => {
  const count: number = await Factions.estimatedDocumentCount();
  return { count: count };
});
