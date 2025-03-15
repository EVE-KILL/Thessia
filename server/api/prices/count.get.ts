import { Prices } from "../../models/Prices";

export default defineEventHandler(async () => {
  const count: number = await Prices.estimatedDocumentCount();
  return { count: count };
});
