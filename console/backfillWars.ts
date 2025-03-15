import { esiFetcher } from "../server/helpers/ESIFetcher";
import { queueUpdateWar } from "../server/queue/War";
import { Wars } from "../server/models/Wars";
import type { IWar } from "../server/interfaces/IWar";

export default {
  name: "backfill:wars",
  description: "Backfill Wars",
  longRunning: false,
  run: async () => {
    let latestWarId = 999999999;
    let hasMoreWars = true;
    const allWarIds: number[] = [];

    while (hasMoreWars) {
      const wars: number[] = await getWars(latestWarId);
      console.log(`ℹ️  Fetched ${wars.length} wars with latestWarId: ${latestWarId}`);

      if (wars.length === 0) {
        hasMoreWars = false;
      }

      // Get the smallest war ID from the fetched wars and set it to latestWarId
      latestWarId = Math.min(...wars);

      // Queue up the war IDs for processing
      for (const warId of wars) {
        // Check if the war already exists in the database, if not, queue it up
        const existingWar: IWar | null = await Wars.findOne({ war_id: warId });
        if (existingWar) {
          continue;
        }

        queueUpdateWar(warId);
      }
    }

    console.log(`✅ Finished fetching wars. Total war IDs fetched: ${allWarIds.length}`);

    return { response: { totalWarIds: allWarIds } };
  },
};

async function getWars(latestWarId: number) {
  const wars = await esiFetcher(
    `${process.env.ESI_URL || "https://esi.evetech.net/"}latest/wars/?max_war_id=${latestWarId}&datasource=tranquility`,
  );
  return wars;
}
