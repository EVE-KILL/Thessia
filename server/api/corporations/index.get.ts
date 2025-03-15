import { defineEventHandler } from "h3";
import type { ICorporation } from "../../interfaces/ICorporation";

export default defineEventHandler(async (event) => {
  const query = getQuery(event);
  const page = query?.page ? Number.parseInt(query.page as string) : 1;
  const corporations: ICorporation[] = await Corporations.find(
    {},
    { corporation_id: 1 },
    { limit: 100000, skip: (page - 1) * 100000 },
  );
  // Return a single array containing all the IDs
  return corporations.map((corporation) => corporation.corporation_id);
});
