import { cliLogger } from "../server/helpers/Logger";
import { RedisStorage } from "../server/helpers/Storage";

export default {
  name: "tqStatus",
  description: "Check the status of the TQ server",
  schedule: "* * * * *",
  run: async () => {
    cliLogger.info("Checking TQ status...");
    const requestOptions: RequestInit = {
      headers: {
        "User-Agent":
          "EVE-KILL Nitro/1.0 (michael@karbowiak.dk; +https://github.com/eve-kill/backend; @lilllamah; @Karbowiak)",
      },
    };

    const request = await fetch(
      `${process.env.ESI_URL || "https://esi.evetech.net/"}/latest/status/?datasource=tranquility`,
      requestOptions,
    );
    const status = await request.json();
    const storage = new RedisStorage();

    if (status.error) {
      // TQ is throwing errors, lets pause the fetcher for 5 minutes
      await storage.set("tqStatus", "offline");
      await storage.set("fetcher_paused", Date.now() + 300000);
    } else {
      switch (request.status) {
        case 503:
          // TQ is offline
          await storage.set("tqStatus", "offline");
          // Pause the fetcher until current time + 5 minutes
          await storage.set("fetcher_paused", Date.now() + 300000);
          break;

        default:
          // TQ is online
          await storage.set("tqStatus", "online");
          await storage.del("fetcher_paused");
          break;
      }
    }

    return cliLogger.info(`TQ Status: ${status.players} players`);
  },
};
