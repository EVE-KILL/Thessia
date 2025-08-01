import {
    compileAccessLogStats,
    getStartOfHour,
} from "../server/helpers/AccessLogStatsCompiler";
import { cliLogger } from "../server/helpers/Logger";
import { AccessLogs } from "../server/models/AccessLogs";
import { AccessLogStats } from "../server/models/AccessLogStats";

export default {
    name: "aggregateAccessLogsHourly",
    description: "Aggregates access logs into hourly statistics",
    schedule: "5 * * * *", // Run 5 minutes past each hour
    run: async () => {
        cliLogger.info("Starting hourly access log aggregation...");

        try {
            // Process the previous hour (to ensure all logs are captured)
            const now = new Date();
            const previousHour = new Date(now.getTime() - 60 * 60 * 1000); // 1 hour ago
            const startOfHour = getStartOfHour(previousHour);
            const endOfHour = new Date(startOfHour.getTime() + 60 * 60 * 1000); // +1 hour

            cliLogger.info(
                `Aggregating logs from ${startOfHour.toISOString()} to ${endOfHour.toISOString()}`
            );

            // Check if this hour has already been processed
            const existingStats = await AccessLogStats.findOne({
                aggregationType: "hourly",
                date: startOfHour,
                hour: startOfHour.getHours(),
            });

            if (existingStats) {
                cliLogger.info(
                    `Hourly stats for ${startOfHour.toISOString()} already exist, skipping...`
                );
                return;
            }

            // Get raw logs for this hour
            const rawLogs = (await AccessLogs.find({
                timestamp: {
                    $gte: startOfHour,
                    $lt: endOfHour,
                },
            }).lean()) as any[];

            cliLogger.info(`Found ${rawLogs.length} raw logs to process`);

            // Compile stats
            const compiledStats = compileAccessLogStats(
                rawLogs,
                "hourly",
                startOfHour,
                startOfHour.getHours()
            );

            // Save compiled stats
            const statsDoc = new AccessLogStats(compiledStats);
            await statsDoc.save();

            cliLogger.info(
                `✅ Hourly aggregation completed: ${rawLogs.length} logs → 1 hourly stat record`
            );
        } catch (error) {
            cliLogger.error(
                `❌ Error during hourly access log aggregation: ${error}`
            );
        }
    },
};
