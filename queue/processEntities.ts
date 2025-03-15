import type { Job } from "bullmq";
import { createWorker } from "../server/helpers/Queue";
import { updateCharacter, updateCharacterHistory } from "../server/queue/Character";
import { updateCorporation, updateCorporationHistory } from "../server/queue/Corporation";
import { updateAlliance } from "../server/queue/Alliance";
import { cliLogger } from "../server/helpers/Logger";

export default {
  name: "process:entities",
  description: "Process updates for characters, corporations and alliances",
  run: () => {
    cliLogger.info("✔ Starting entity processor");

    createWorker(
      "character",
      async (job: Job) => {
        await updateCharacter(job.data.characterId);
      },
      {
        concurrency: 5,
      },
    )
      .on("failed", (job: Job | undefined, err: Error) => {
        cliLogger.error(
          `Character Update: ${job?.id} ( CharacterID: ${job?.data.characterId} ) | ${err.message} | ${process.env.ESI_URL || "https://esi.evetech.net/"}latest/characters/${job?.data.characterId}/`,
        );
      })
      .on("completed", (job: Job) => {
        cliLogger.info(
          `Character Update: ${job.id} ( CharacterID: ${job.data.characterId} ) | Completed`,
        );
      })
      .on("ready", () => {
        cliLogger.info("Character Worker Ready");
      });

    createWorker(
      "corporation",
      async (job: Job) => {
        await updateCorporation(job.data.corporationId);
      },
      {
        concurrency: 5,
      },
    )
      .on("failed", (job: Job | undefined, err: Error) => {
        cliLogger.error(
          `Corporation Update: ${job?.id} ( CorporationID: ${job?.data.corporationId} ) | ${err.message} | ${process.env.ESI_URL || "https://esi.evetech.net/"}latest/corporations/${job?.data.corporationId}/`,
        );
      })
      .on("completed", (job: Job) => {
        cliLogger.info(
          `Corporation Update: ${job.id} ( CorporationID: ${job.data.corporationId} ) | Completed`,
        );
      })
      .on("ready", () => {
        cliLogger.info("Corporation Worker Ready");
      });

    createWorker(
      "alliance",
      async (job: Job) => {
        await updateAlliance(job.data.allianceId);
      },
      {
        concurrency: 5,
      },
    )
      .on("failed", (job: Job | undefined, err: Error) => {
        cliLogger.error(
          `Alliance Update: ${job?.id} ( AllianceID: ${job?.data.allianceId} ) | ${err.message} | ${process.env.ESI_URL || "https://esi.evetech.net/"}latest/alliances/${job?.data.allianceId}/`,
        );
      })
      .on("completed", (job: Job) => {
        cliLogger.info(
          `Alliance Update: ${job.id} ( AllianceID: ${job.data.allianceId} ) | Completed`,
        );
      })
      .on("ready", () => {
        cliLogger.info("Alliance Worker Ready");
      });

    createWorker(
      "characterhistory",
      async (job: Job) => {
        await updateCharacterHistory(job.data.characterId);
        // Sleep for a random amount of time, between 100ms and 1000ms
        const sleepTime = Math.floor(Math.random() * 1500) + 100;
        await new Promise((resolve) => setTimeout(resolve, sleepTime));
      },
      {
        concurrency: 1,
      },
    )
      .on("failed", (job: Job | undefined, err: Error) => {
        cliLogger.error(
          `Character History Update: ${job?.id} ( CharacterID: ${job?.data.characterId} ) | ${err.message} | ${process.env.ESI_URL || "https://esi.evetech.net/"}latest/characters/${job?.data.characterId}/`,
        );
      })
      .on("completed", (job: Job) => {
        cliLogger.info(
          `Character History Update: ${job.id} ( CharacterID: ${job.data.characterId} ) | Completed`,
        );
      })
      .on("ready", () => {
        cliLogger.info("Character History Worker Ready");
      });

    createWorker(
      "corporationhistory",
      async (job: Job) => {
        await updateCorporationHistory(job.data.corporationId);
        // Sleep for a random amount of time, between 100ms and 1000ms
        const sleepTime = Math.floor(Math.random() * 1500) + 100;
        await new Promise((resolve) => setTimeout(resolve, sleepTime));
      },
      {
        concurrency: 1,
      },
    )
      .on("failed", (job: Job | undefined, err: Error) => {
        cliLogger.error(
          `Corporation History Update: ${job?.id} ( CorporationID: ${job?.data.corporationId} ) | ${err.message} | ${process.env.ESI_URL || "https://esi.evetech.net/"}latest/corporations/${job?.data.corporationId}/`,
        );
      })
      .on("completed", (job: Job) => {
        cliLogger.info(
          `Corporation History Update: ${job.id} ( CorporationID: ${job.data.corporationId} ) | Completed`,
        );
      })
      .on("ready", () => {
        cliLogger.info("Corporation History Worker Ready");
      });
  },
};
