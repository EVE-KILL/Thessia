import { cliLogger } from "../server/helpers/Logger";
import { esiFetcher } from "../server/helpers/ESIFetcher";
import type { IWar } from "../server/interfaces/IWar";
import { queueUpdateWar } from "../server/queue/War";
import { Wars } from "../server/models/Wars";

export default {
  name: "fetchWars",
  description: "Fetch wars from ESI",
  schedule: "0 * * * *",
  run: async () => {
    const wars: number[] = await getLatestWars();
    let newWars = 0;
    for (const warId of wars) {
      const existingWar: IWar | null = await Wars.findOne({ war_id: warId });
      if (existingWar) {
        continue;
      }

      queueUpdateWar(warId);
      newWars++;
    }

    if (process.env.BACKEND_DISCORD_URL !== undefined && newWars > 0) {
      await fetch(process.env.BACKEND_DISCORD_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          content: `Found ${newWars} new wars`,
        }),
      });
    }

    return cliLogger.info(`Found ${newWars} new wars`);
  },
};

async function getLatestWars() {
  const wars = await esiFetcher(`${process.env.ESI_URL || "https://esi.evetech.net/"}latest/wars/`);
  return wars;
}
