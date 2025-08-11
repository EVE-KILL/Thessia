import { cliLogger } from "../server/helpers/Logger";
import { Characters } from "../server/models/Characters";
import {
    hasQueuedJobs,
    queueHistoricalStatsProcessingBulk,
} from "../server/queue/HistoricalStats";

export default {
    name: "updateHistoricalCounts",
    description: "Queue historical counts processing jobs",
    schedule: "0 0 * * *",
    run: async () => {
        const currentDate = new Date();
        cliLogger.info("Starting historical stats job queueing...");

        // Check if there are already jobs in the queue
        const hasExistingJobs = await hasQueuedJobs();
        if (hasExistingJobs) {
            cliLogger.info(
                "⏸️ Historical stats queue already has pending jobs, skipping this run to prevent duplicates"
            );
            return cliLogger.info(
                "Historical stats job queueing skipped - queue not empty"
            );
        }

        // Collect all alliances that need processing
        cliLogger.info("Collecting alliances for processing...");
        const allianceAggregationCursor = Characters.aggregate([
            {
                $match: {
                    alliance_id: { $exists: true, $ne: 0 },
                },
            },
            {
                $group: {
                    _id: { alliance_id: "$alliance_id" },
                    count: { $sum: 1 },
                },
            },
        ]).cursor();

        const alliances: Array<{
            entityId: number;
            entityType: "alliance";
            memberCount: number;
        }> = [];
        for (
            let alliance = await allianceAggregationCursor.next();
            alliance != null;
            alliance = await allianceAggregationCursor.next()
        ) {
            alliances.push({
                entityId: alliance._id.alliance_id,
                entityType: "alliance" as const,
                memberCount: alliance.count,
            });
        }

        cliLogger.info(`Found ${alliances.length} alliances to process`);

        // Log some sample alliance counts for debugging
        if (alliances.length > 0) {
            const samples = alliances.slice(0, 3);
            samples.forEach((alliance) => {
                cliLogger.info(
                    `  Sample alliance ${alliance.entityId}: ${alliance.memberCount} members`
                );
            });
        }

        // Collect all corporations that need processing
        cliLogger.info("Collecting corporations for processing...");
        const corporationAggregationCursor = Characters.aggregate([
            {
                $match: {
                    corporation_id: {
                        $exists: true,
                        $ne: 0,
                        $gt: 1999999,
                    },
                },
            },
            {
                $group: {
                    _id: { corporation_id: "$corporation_id" },
                    count: { $sum: 1 },
                },
            },
        ]).cursor();

        const corporations: Array<{
            entityId: number;
            entityType: "corporation";
            memberCount: number;
        }> = [];
        for (
            let corporation = await corporationAggregationCursor.next();
            corporation != null;
            corporation = await corporationAggregationCursor.next()
        ) {
            corporations.push({
                entityId: corporation._id.corporation_id,
                entityType: "corporation" as const,
                memberCount: corporation.count,
            });
        }

        cliLogger.info(`Found ${corporations.length} corporations to process`);

        // Log some sample corporation counts for debugging
        if (corporations.length > 0) {
            const samples = corporations.slice(0, 3);
            samples.forEach((corp) => {
                cliLogger.info(
                    `  Sample corporation ${corp.entityId}: ${corp.memberCount} members`
                );
            });
        }

        // Queue all entities in bulk
        const allEntities = [...alliances, ...corporations];
        cliLogger.info(
            `Queueing ${allEntities.length} total entities for processing...`
        );

        await queueHistoricalStatsProcessingBulk(allEntities, currentDate);

        cliLogger.info(
            `✅ Successfully queued ${allEntities.length} historical stats processing jobs`
        );
        cliLogger.info(`   - ${alliances.length} alliances`);
        cliLogger.info(`   - ${corporations.length} corporations`);

        return cliLogger.info("Historical stats job queueing completed");
    },
};
