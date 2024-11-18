import { Prices } from "../../models/Prices";

export default defineEventHandler(async (event) => {
  const count: Number = await Prices.estimatedDocumentCount();
  return { count: count };
});
