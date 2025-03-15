import _ from "lodash";
import { cliLogger } from "../server/helpers/Logger";
import { processChunk } from "../server/helpers/Affiliation";
import { createQueue } from "../server/helpers/Queue";
import { Characters } from "../server/models/Characters";

export default {
  name: "affiliationUpdate",
  description: "Updates the affiliations of characters",
  schedule: "* * * * *",
  run: async () => {
    cliLogger.info("Updating affiliations");

    // If the queue isn't empty, we don't want to run this task
    const queue = createQueue("character");
    const queueCount = await queue.getJobCounts();

    if (queueCount.waiting > 0 || queueCount.active > 0 || queueCount.prioritized > 0) {
      return cliLogger.info("Queue has data, skipping");
    }

    const limit = 10000; // Get up to 10000 characters at a time, this means we send 10 requests to ESI

    /**
     * We need to limit the amount of characters we update at any one time.
     * To do this we have the updatedAt and last_active fields on the character document.
     * Using these we should follow these rules:
     * 1. If the character has been active in the last 30 days - we update them daily
     * 2. If the character has been active in the last 60 days - we update them every 3 days
     * 3. If the character has been active in the last 90 days - we update them weekly
     * 4. If the character has been active in the last 180 days - we update them every two weeks
     * 5. Beyond that the character is updated monthly
     */

    const queries = [
      // 30 days
      {
        last_active: { $gt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 30) },
        updatedAt: { $lt: new Date(Date.now() - 1000 * 60 * 60 * 24) },
      },
      // 60 days
      {
        last_active: { $gt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 60) },
        updatedAt: { $lt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3) },
      },
      // 90 days
      {
        last_active: { $gt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 90) },
        updatedAt: { $lt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7) },
      },
      // 180 days
      {
        last_active: { $gt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 180) },
        updatedAt: { $lt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 14) },
      },
      // 365 days
      {
        last_active: { $gt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 365) },
        updatedAt: { $lt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 30) },
      },
    ];

    const characters = [];
    for (const query of queries) {
      const chunk = await Characters.find(
        {
          deleted: { $ne: true },
          ...query,
        },
        {
          _id: 0,
          character_id: 1,
          corporation_id: 1,
          alliance_id: 1,
        },
        {
          limit: limit,
        },
      );

      for (const character of chunk) {
        characters.push(character);
      }
    }

    cliLogger.info(`Found ${characters.length} characters to check`);

    // We can only fetch upwards of 1000 characters at a time, so we have to spluit the characters into chunks
    const characterChunks = _.chunk(characters, 1000);
    let queuedCount = 0;

    // For each character chunk we fetch the character data
    for (const chunk of characterChunks) {
      let count = 0;
      count = await processChunk(chunk);
      queuedCount += count;
    }

    if (process.env.BACKEND_DISCORD_URL !== undefined && queuedCount > 0) {
      await fetch(process.env.BACKEND_DISCORD_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          content: `Queued ${queuedCount} characters for affiliation update`,
        }),
      });
    }

    return cliLogger.info(`Queued ${queuedCount} characters for affiliation update`);
  },
};
