import { defineEventHandler } from "h3";

export default defineEventHandler(async () => {
  const count: number = await Corporations.estimatedDocumentCount();
  return { count: count };
});
