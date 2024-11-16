import { Prices } from "../../models/Prices";
//import { Killmail } from "../../../types/IKillmail";

export default defineEventHandler(async (event) => {
  const count = await Prices.estimatedDocumentCount();
  return { count: count };
});
