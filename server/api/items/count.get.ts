import { defineEventHandler } from "h3";

export default defineEventHandler(async () => {
  const count: number = await InvTypes.estimatedDocumentCount();
  return { count: count };
});
