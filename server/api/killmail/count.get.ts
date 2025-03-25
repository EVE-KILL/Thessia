import { Killmails } from "~/server/models/Killmails";

export default defineEventHandler(async () => {
  const count: number = await Killmails.estimatedDocumentCount();
  return { count: count };
});
