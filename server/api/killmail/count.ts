import { Killmails } from "../../models/Killmails";

export default defineEventHandler(async (event) => {
  const count = await Killmails.estimatedDocumentCount();
  return { count: count };
});
