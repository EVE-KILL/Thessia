import { cliLogger } from "~/server/helpers/Logger";
import { ESILogs } from "~/server/models/ESILogs";

export default {
    name: "cleanupEsiLogs",
    description:
        "Clean up ESI logs older than 30 days to prevent database bloat",
    schedule: "0 2 * * *", // Run daily at 2 AM
    run: async () => {
        cliLogger.info("Starting ESI logs cleanup...");

        try {
            // Calculate date 30 days ago
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

            // Count logs to be deleted for logging
            const countToDelete = await ESILogs.countDocuments({
                timestamp: { $lt: thirtyDaysAgo },
            });

            if (countToDelete === 0) {
                cliLogger.info("No ESI logs older than 30 days found");
                return;
            }

            // Delete logs older than 30 days
            const result = await ESILogs.deleteMany({
                timestamp: { $lt: thirtyDaysAgo },
            });

            cliLogger.info(
                `Successfully deleted ${result.deletedCount} ESI logs older than 30 days`
            );

            // Log remaining count for monitoring
            const remainingCount = await ESILogs.countDocuments();
            cliLogger.info(`Remaining ESI logs in database: ${remainingCount}`);
        } catch (error) {
            cliLogger.error(`Error during ESI logs cleanup: ${error}`);
        }
    },
};
