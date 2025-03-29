import { cliLogger } from "~/server/helpers/Logger";
import { Wars } from "~/server/models/Wars";
import { queueUpdateWar } from "~/server/queue/War";

export default {
  name: "updateWars",
  description: "Update existing wars that aren't done",
  schedule: "0 0 * * *",
  run: async () => {
    const activeWars = await Wars.find({ finished: { $exists: false } });

    cliLogger.info(`ℹ️  Found ${activeWars.length} active wars`);

    for (const war of activeWars) {
      queueUpdateWar(war.war_id);
    }

    cliLogger.info(`ℹ️  Queued ${activeWars.length} wars for update`);
  },
};
