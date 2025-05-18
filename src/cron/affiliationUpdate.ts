import _ from "lodash";
import { processChunk } from "~/server/helpers/Affiliation";
import { cliLogger } from "~/server/helpers/Logger";
import { createQueue } from "~/server/helpers/Queue";
import { Characters } from "~/server/models/Characters";

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

        // Try an alternative approach: restructure the query to avoid $ne which can be problematic for indexes
        const queries = [
            {
                query: {
                    deleted: false, // Use exact match instead of $ne
                    last_active: { $gt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 30) }, // Active in last 30 days
                    updatedAt: { $lt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 1) }, // Updated more than 1 day ago
                }
            },
            {
                query: {
                    deleted: false, // Use exact match instead of $ne
                    last_active: { $lte: new Date(Date.now() - 1000 * 60 * 60 * 24 * 30) }, // Not active in last 30 days
                    updatedAt: { $lt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 14) }, // Updated more than 14 days ago
                }
            },
        ];

        const characters = [];
        for (const { query } of queries) {
            const startTime = Date.now();
            const chunk = await Characters.find(
                query,
                {
                    _id: 0,
                    character_id: 1,
                    corporation_id: 1,
                    alliance_id: 1,
                },
                {
                    limit: limit,
                }
            ); // Let MongoDB choose the best index

            const queryTime = Date.now() - startTime;
            cliLogger.info(`Query executed in ${queryTime}ms, found ${chunk.length} characters`);

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
