import { defineEventHandler } from "h3";
import type { IAlliance } from "~/server/interfaces/IAlliance";

export default defineEventHandler(async () => {
  const alliances: IAlliance[] = await Alliances.find({}, { alliance_id: 1 });
  // Return a single array containing all the IDs
  return alliances.map((alliance) => alliance.alliance_id);
});
