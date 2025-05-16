import { cliLogger } from "~/server/helpers/Logger";
import type { StatsType } from "~/server/interfaces/IStats";
import { Alliances } from "~/server/models/Alliances";
import { Characters } from "~/server/models/Characters";
import { Corporations } from "~/server/models/Corporations";
import { addStatsJob } from "~/server/queue/Stats";

export default {
    name: "backfillStatsCalculations",
    description: "Generates stats for all entities in the database for multiple time periods",
    longRunning: true,
    run: async () => {
        const TIME_PERIODS = [0, 14, 30, 90];

        const processEntities = async (
            entityType: StatsType,
            entities: any[],
            idField: string,
            nameField: string,
        ) => {
            cliLogger.info(`ℹ️  Backfilling stats for ${entities.length} ${entityType}s across ${TIME_PERIODS.length} time periods.`);
            let processedCount = 0;
            const totalJobs = entities.length * TIME_PERIODS.length;

            for (const entity of entities) {
                const entityId = entity[idField];
                if (!entityId) continue;

                cliLogger.info(`🔄  Backfilling ${entity[nameField]}...`);
                for (const days of TIME_PERIODS) {
                    try {
                        await addStatsJob(entityType, entityId, days, 1);
                        //const stats: IStatsDocument = await calculateAllStats(entityType, entityId, days);
                        //await Stats.findOneAndUpdate(
                        //    { type: entityType, id: entityId, days: days },
                        //    stats,
                        //    { upsert: true, setDefaultsOnInsert: true }
                        //);
                        processedCount++;
                        const entityName = entity[nameField] || entityId;
                        cliLogger.info(`✔️  [${processedCount}/${totalJobs}] Backfilled ${entityType} ${entityName} (${entityId}) for ${days} days`);
                    } catch (err: any) {
                        const entityName = entity[nameField] || entityId;
                        cliLogger.error(`❌  [${processedCount + 1}/${totalJobs}] Error for ${entityType} ${entityName} (${entityId}), ${days} days: ${err.message}`);
                    }
                }
            }
            cliLogger.info(`✅  Backfill complete for ${entityType}s. Processed jobs: ${processedCount}/${totalJobs}`);
        };

        // Process Alliances
        const alliances = await Alliances.find({}).lean();
        await processEntities("alliance_id", alliances, "alliance_id", "name");

        // Process Corporations
        const corporations = await Corporations.find({}).lean();
        await processEntities("corporation_id", corporations, "corporation_id", "name");

        // Process Characters
        const characters = await Characters.find({}).lean(); // Consider batching if there are too many characters
        await processEntities("character_id", characters, "character_id", "name");

        cliLogger.info("🎉 All stats backfill processes complete.");
    },
};
