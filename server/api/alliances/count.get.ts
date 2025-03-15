import { defineEventHandler } from "h3";

export default defineEventHandler(async () => {
  const count: number = await Alliances.estimatedDocumentCount();
  return { count: count };
});
