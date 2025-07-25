import { cliLogger } from "~/server/helpers/Logger";
import { Stats } from "~/server/models/Stats";
import { addBulkStatsJobs } from "~/server/queue/Stats";

export default {
    name: "updateStats",
    description: "Finds stats that need to be updated and queues them",
    schedule: "0 * * * *",
    run: async () => {
        return;
        cliLogger.info("Updating stats");

        // From the stats collection, find all documents that have needsUpdate set to true
        // We only look for days: 0 as a trigger, but will update all related stat periods
        const statsToUpdate = await Stats.find({
            needsUpdate: true,
            days: 0,
        }).lean();

        if (statsToUpdate.length === 0) {
            cliLogger.info("No stats need updating");
            return;
        }

        cliLogger.info(
            `Found ${statsToUpdate.length} stats documents that need updating`
        );

        // Get current date information for frequency checks
        const now = new Date();
        const currentHour = now.getHours();
        const currentDay = now.getDay(); // 0-6, Sunday is 0

        // Track queued jobs
        let queuedCount = 0;

        for (const stat of statsToUpdate) {
            // Determine if this stat should be updated based on frequency rules
            let shouldUpdate = false;
            let priority = 5; // Default priority (lower number = higher priority)

            // Characters: update every hour (always)
            if (stat.type === "character_id") {
                shouldUpdate = true;
                priority = 5;
            }
            // Corporations: update once a day (first hour of day)
            else if (stat.type === "corporation_id") {
                // Check if this is a small corporation (less than 50k kills+losses)
                const isSmallCorp = stat.kills + stat.losses < 50000;

                // Update small corps every hour, larger corps only at midnight
                if (isSmallCorp || currentHour === 0) {
                    shouldUpdate = true;
                    priority = isSmallCorp ? 10 : 15;
                }
            }
            // Alliances: update once a week (Sunday at midnight) or if small
            else if (stat.type === "alliance_id") {
                // Check if this is a small alliance (less than 50k kills+losses)
                const isSmallAlliance = stat.kills + stat.losses < 50000;

                // Update small alliances daily (at midnight), larger alliances weekly (Sunday midnight)
                if (isSmallAlliance && currentHour === 0) {
                    shouldUpdate = true;
                    priority = 20;
                } else if (currentDay === 0 && currentHour === 0) {
                    // Sunday at midnight for large alliances
                    shouldUpdate = true;
                    priority = 25;
                }
            }

            if (shouldUpdate) {
                // Queue jobs for all stat periods (0, 14, 30, 90 days)
                const statPeriods = [0, 14, 30, 90];
                for (const days of statPeriods) {
                    await addStatsJob(stat.type, stat.id, days, priority);
                    queuedCount++;
                }

                // Reset the needsUpdate flag for all related stat documents
                await Stats.updateMany(
                    {
                        type: stat.type,
                        id: stat.id,
                    },
                    { $set: { needsUpdate: false } }
                );
            }
        }

        cliLogger.info(`Queued ${queuedCount} stats jobs for update`);
    },
};
