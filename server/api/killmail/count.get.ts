import { Killmails } from "../../models/Killmails";

export default defineEventHandler(async () => {
  const count: number = await Killmails.estimatedDocumentCount();
  return { count: count };
});
