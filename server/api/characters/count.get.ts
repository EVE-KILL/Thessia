import { defineEventHandler } from "h3";

export default defineEventHandler(async () => {
  const count: number = await Characters.estimatedDocumentCount();
  return { count: count };
});
