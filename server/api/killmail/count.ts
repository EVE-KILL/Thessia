import { Killmails } from "../../models/Killmails";

export default defineEventHandler(async (event) => {
  let count = await Killmails.estimatedDocumentCount();
  return { count: count };
});
