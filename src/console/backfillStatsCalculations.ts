import { cliLogger } from "~/server/helpers/Logger";
import { createQueue } from "~/server/helpers/Queue";
import type { StatsType } from "~/server/interfaces/IStats";
import { Killmails } from "~/server/models/Killmails"; // Import Killmails model
import { Stats } from "~/server/models/Stats"; // Import Stats model

export default {
    name: "backfillStatsCalculations",
    description: "Generates stats for all entities in the database for multiple time periods",
    longRunning: false,
    run: async () => {
        const TIME_PERIODS = [0, 14, 30, 90];
        const BULK_SIZE = 1000000;

        const statsQueue = createQueue('stats');

        /**
         * Get a set of all entity IDs that already have stats calculated
         */
        async function getExistingStatsIds(entityType: StatsType): Promise<Set<number>> {
            cliLogger.info(`📊 Fetching existing ${entityType} IDs from Stats collection...`);

            // Query Stats collection for all unique IDs of this entity type
            const existingIds = await Stats.distinct('id', { type: entityType });

            cliLogger.info(`✅ Found ${existingIds.length} ${entityType}s with existing stats`);
            return new Set(existingIds);
        }

        /**
         * Get unique entity IDs from the Killmails collection
         * @param entityType Type of entity to extract (character_id, corporation_id, alliance_id)
         */
        async function getUniqueEntityIdsFromKillmails(entityType: StatsType): Promise<number[]> {
            cliLogger.info(`🔍 Extracting unique ${entityType}s from killmails...`);

            const startTime = Date.now();
            let uniqueIds = new Set<number>();

            // Process victim IDs using direct grouping (without existence check)
            cliLogger.info(`📊 Processing victim ${entityType}s...`);
            const victimAggregation = Killmails.aggregate([
                { $group: { _id: `$victim.${entityType}` } },
                { $project: { _id: 0, id: "$_id" } }
            ]).cursor({ batchSize: 10000 });

            for await (const doc of victimAggregation) {
                if (doc.id && doc.id > 0) {
                    uniqueIds.add(Number(doc.id));
                }
            }

            // Process attacker IDs using an optimized aggregation approach
            cliLogger.info(`📊 Processing attacker ${entityType}s...`);

            // Instead of unwinding, we can use $project with $filter to extract the entity IDs
            // This keeps the result size manageable and avoids the expensive $unwind
            const attackerAggregation = Killmails.aggregate([
                {
                    $project: {
                        _id: 0,
                        entityIds: {
                            $filter: {
                                input: `$attackers.${entityType}`,
                                as: "id",
                                cond: { $gt: ["$$id", 0] }
                            }
                        }
                    }
                },
                { $unwind: "$entityIds" },  // This unwind is on a much smaller dataset
                { $group: { _id: "$entityIds" } },
                { $project: { _id: 0, id: "$_id" } }
            ]).cursor({ batchSize: 10000 });

            for await (const doc of attackerAggregation) {
                if (doc.id && doc.id > 0) {
                    uniqueIds.add(Number(doc.id));
                }
            }

            const duration = ((Date.now() - startTime) / 1000).toFixed(2);
            const idsArray = Array.from(uniqueIds).filter(id => id > 0);

            cliLogger.info(`✅ Found ${idsArray.length} unique ${entityType}s in killmails (took ${duration}s)`);
            return idsArray;
        }

        /**
         * Queue stats calculation jobs for entity IDs
         */
        async function queueStatsForEntityIds(entityType: StatsType, entityIds: number[]) {
            const existingStatsIds = await getExistingStatsIds(entityType);

            cliLogger.info(`ℹ️ Backfilling stats for ${entityIds.length} ${entityType}s across ${TIME_PERIODS.length} time periods.`);

            let processedCount = 0;
            let bulkJobs = [];
            let timePeriodsCounters = {};

            // Initialize counters for each time period
            TIME_PERIODS.forEach(days => {
                timePeriodsCounters[days] = 0;
            });

            // Function to add bulk jobs to queue
            const flushBulkJobs = async () => {
                if (bulkJobs.length === 0) return;

                try {
                    await statsQueue.addBulk(bulkJobs.map(job => ({
                        name: job.name,
                        data: job.data,
                        opts: {
                            priority: 1,
                            attempts: 10,
                            backoff: {
                                type: "fixed",
                                delay: 5000
                            },
                            removeOnComplete: 1000,
                            removeOnFail: 5000
                        }
                    })));
                    cliLogger.info(`✅ Added ${bulkJobs.length} jobs to queue in bulk`);
                } catch (error) {
                    cliLogger.error(`❌ Error adding bulk jobs to queue: ${error}`);
                }

                bulkJobs = [];
            };

            // Process each entity ID
            for (const entityId of entityIds) {
                // Skip if this entity already has stats calculated
                if (existingStatsIds.has(entityId)) {
                    continue;
                }

                for (const days of TIME_PERIODS) {
                    bulkJobs.push({
                        name: 'stats',
                        data: {
                            entityType: entityType,
                            entityId: entityId,
                            days: days,
                            priority: 1
                        }
                    });

                    // When we reach bulk size, add jobs to queue
                    if (bulkJobs.length >= BULK_SIZE) {
                        await flushBulkJobs();
                    }

                    processedCount++;
                    timePeriodsCounters[days]++;

                    // Log only every 10000 jobs to avoid log spam, and also log periodically for each time period
                    if (processedCount % 10000 === 0) {
                        cliLogger.info(`✔️ [${processedCount}] Processing ${entityType}s... Time periods progress: ${TIME_PERIODS.map(days => `${days} days: ${timePeriodsCounters[days]}`).join(', ')
                            }`);
                    }
                }
            }

            // Process any remaining jobs
            if (bulkJobs.length > 0) {
                await flushBulkJobs();
            }

            const totalPossibleJobs = entityIds.length * TIME_PERIODS.length;
            cliLogger.info(`✅ Backfill complete for ${entityType}s. Processed: ${processedCount}/${totalPossibleJobs}`);
            cliLogger.info(`📊 Stats by time period: ${TIME_PERIODS.map(days => `${days} days: ${timePeriodsCounters[days]}`).join(', ')
                }`);
        }

        // Process alliance_ids from killmails
        //const allianceIds = await getUniqueEntityIdsFromKillmails("alliance_id");
        //await queueStatsForEntityIds("alliance_id", allianceIds);

        // Process corporation_ids from killmails
        //const corporationIds = await getUniqueEntityIdsFromKillmails("corporation_id");
        //await queueStatsForEntityIds("corporation_id", corporationIds);

        // Process character_ids from killmails
        const characterIds = await getUniqueEntityIdsFromKillmails("character_id");
        await queueStatsForEntityIds("character_id", characterIds);

        cliLogger.info("🎉 All stats backfill processes complete.");
    },
};
