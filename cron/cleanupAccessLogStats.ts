import { cliLogger } from "../server/helpers/Logger";
import { AccessLogStats } from "../server/models/AccessLogStats";

export default {
    name: "cleanupAccessLogStats",
    description:
        "Clean up old access log statistics (hourly: 30 days, daily: 365 days)",
    schedule: "0 3 * * *", // Run daily at 3 AM
    run: async () => {
        cliLogger.info("Starting access log stats cleanup...");

        try {
            const now = new Date();

            // Calculate cutoff dates
            const hourlyCutoff = new Date(
                now.getTime() - 30 * 24 * 60 * 60 * 1000
            ); // 30 days ago
            const dailyCutoff = new Date(
                now.getTime() - 365 * 24 * 60 * 60 * 1000
            ); // 365 days ago

            // Count records to be deleted for logging
            const hourlyCountToDelete = await AccessLogStats.countDocuments({
                aggregationType: "hourly",
                date: { $lt: hourlyCutoff },
            });

            const dailyCountToDelete = await AccessLogStats.countDocuments({
                aggregationType: "daily",
                date: { $lt: dailyCutoff },
            });

            if (hourlyCountToDelete === 0 && dailyCountToDelete === 0) {
                cliLogger.info("No old access log stats found to cleanup");
                return;
            }

            // Cleanup hourly stats older than 30 days
            const hourlyResult = await AccessLogStats.deleteMany({
                aggregationType: "hourly",
                date: { $lt: hourlyCutoff },
            });

            cliLogger.info(
                `Deleted ${hourlyResult.deletedCount} hourly access log stats older than 30 days`
            );

            // Cleanup daily stats older than 365 days
            const dailyResult = await AccessLogStats.deleteMany({
                aggregationType: "daily",
                date: { $lt: dailyCutoff },
            });

            cliLogger.info(
                `Deleted ${dailyResult.deletedCount} daily access log stats older than 365 days`
            );

            const totalDeleted =
                hourlyResult.deletedCount + dailyResult.deletedCount;
            cliLogger.info(
                `Access log stats cleanup completed. Total deleted: ${totalDeleted} records`
            );

            // Log remaining count for monitoring
            const remainingCount = await AccessLogStats.countDocuments();
            cliLogger.info(
                `Remaining access log stats in database: ${remainingCount}`
            );
        } catch (error) {
            cliLogger.error(`Error during access log stats cleanup: ${error}`);
            throw error;
        }
    },
};
