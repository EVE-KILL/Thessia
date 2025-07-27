import { cliLogger } from "~/server/helpers/Logger";
import { createQueue } from "~/server/helpers/Queue";
import type { StatsType } from "~/server/interfaces/IStats";
import { Killmails } from "~/server/models/Killmails"; // Import Killmails model
import { Stats } from "~/server/models/Stats"; // Import Stats model

export default {
    name: "backfillStatsCalculations",
    description:
        "Generates stats for all entities in the database for multiple time periods",
    longRunning: false,
    run: async () => {
        const TIME_PERIODS = [0, 14, 30, 90];
        const BULK_SIZE = 1000000;

        const statsQueue = createQueue("stats");

        /**
         * Get a set of all entity IDs that already have stats calculated
         */
        async function getExistingStatsIds(
            entityType: StatsType
        ): Promise<Set<number>> {
            cliLogger.info(
                `📊 Fetching existing ${entityType} IDs from Stats collection...`
            );

            const existingIds = new Set<number>();
            let processedCount = 0;

            // Use aggregation with cursor to avoid 16MB limit of distinct()
            const cursor = Stats.aggregate([
                { $match: { type: entityType } },
                { $group: { _id: "$id" } },
                { $project: { _id: 1 } },
            ]).cursor();

            for await (const doc of cursor) {
                existingIds.add(Number(doc._id));
                processedCount++;

                // Log progress every 100,000 IDs
                if (processedCount % 100000 === 0) {
                    cliLogger.info(
                        `📊 Processed ${processedCount.toLocaleString()} existing ${entityType} stats so far...`
                    );
                }
            }

            cliLogger.info(
                `✅ Found ${existingIds.size} ${entityType}s with existing stats`
            );
            return existingIds;
        }

        /**
         * Get unique entity IDs for ALL entity types from the Killmails collection in a single pass
         */
        async function getAllUniqueEntityIdsFromKillmails(): Promise<{
            alliance_id: number[];
            corporation_id: number[];
            character_id: number[];
        }> {
            cliLogger.info(
                `🔍 Extracting ALL unique entity IDs from killmails in single pass...`
            );

            const startTime = Date.now();
            const allianceIds = new Set<number>();
            const corporationIds = new Set<number>();
            const characterIds = new Set<number>();
            let processedCount = 0;

            // Use a simple find cursor with projection to only get the fields we need
            const cursor = Killmails.find(
                {}, // No filter - process all documents
                {
                    // Project only the fields we need to minimize data transfer
                    "victim.alliance_id": true,
                    "victim.corporation_id": true,
                    "victim.character_id": true,
                    "attackers.alliance_id": true,
                    "attackers.corporation_id": true,
                    "attackers.character_id": true,
                    _id: false,
                } as any
            ).cursor();

            cliLogger.info(`📊 Processing killmails for ALL entity types...`);

            for await (const doc of cursor) {
                // Extract victim IDs
                if (doc.victim) {
                    if (doc.victim.alliance_id && doc.victim.alliance_id > 0) {
                        allianceIds.add(Number(doc.victim.alliance_id));
                    }
                    if (
                        doc.victim.corporation_id &&
                        doc.victim.corporation_id > 0
                    ) {
                        corporationIds.add(Number(doc.victim.corporation_id));
                    }
                    if (
                        doc.victim.character_id &&
                        doc.victim.character_id > 0
                    ) {
                        characterIds.add(Number(doc.victim.character_id));
                    }
                }

                // Extract attacker IDs
                if (doc.attackers && Array.isArray(doc.attackers)) {
                    for (const attacker of doc.attackers) {
                        if (attacker.alliance_id && attacker.alliance_id > 0) {
                            allianceIds.add(Number(attacker.alliance_id));
                        }
                        if (
                            attacker.corporation_id &&
                            attacker.corporation_id > 0
                        ) {
                            corporationIds.add(Number(attacker.corporation_id));
                        }
                        if (
                            attacker.character_id &&
                            attacker.character_id > 0
                        ) {
                            characterIds.add(Number(attacker.character_id));
                        }
                    }
                }

                processedCount++;

                // Log progress every 1 million documents
                if (processedCount % 1000000 === 0) {
                    cliLogger.info(
                        `📊 Processed ${processedCount.toLocaleString()} killmails, found ${allianceIds.size.toLocaleString()} alliances, ${corporationIds.size.toLocaleString()} corporations, ${characterIds.size.toLocaleString()} characters so far...`
                    );
                }
            }

            const duration = ((Date.now() - startTime) / 1000).toFixed(2);

            cliLogger.info(
                `✅ Single pass complete! Found ${allianceIds.size.toLocaleString()} alliances, ${corporationIds.size.toLocaleString()} corporations, ${characterIds.size.toLocaleString()} characters from ${processedCount.toLocaleString()} killmails (took ${duration}s)`
            );

            return {
                alliance_id: Array.from(allianceIds),
                corporation_id: Array.from(corporationIds),
                character_id: Array.from(characterIds),
            };
        }

        /**
         * Queue stats calculation jobs for entity IDs
         */
        async function queueStatsForEntityIds(
            entityType: StatsType,
            entityIds: number[]
        ) {
            const existingStatsIds = await getExistingStatsIds(entityType);

            cliLogger.info(
                `ℹ️ Backfilling stats for ${entityIds.length} ${entityType}s across ${TIME_PERIODS.length} time periods.`
            );

            let processedCount = 0;
            let bulkJobs: Array<{
                name: string;
                data: {
                    entityType: StatsType;
                    entityId: number;
                    days: number;
                    priority: number;
                };
            }> = [];
            let timePeriodsCounters: Record<number, number> = {};

            // Initialize counters for each time period
            TIME_PERIODS.forEach((days) => {
                timePeriodsCounters[days] = 0;
            });

            // Function to add bulk jobs to queue
            const flushBulkJobs = async () => {
                if (bulkJobs.length === 0) return;

                try {
                    await statsQueue.addBulk(
                        bulkJobs.map((job) => ({
                            name: job.name,
                            data: job.data,
                            opts: {
                                priority: 100,
                                attempts: 10,
                                backoff: {
                                    type: "fixed",
                                    delay: 5000,
                                },
                                removeOnComplete: 1000,
                                removeOnFail: 5000,
                            },
                        }))
                    );
                    cliLogger.info(
                        `✅ Added ${bulkJobs.length} jobs to queue in bulk`
                    );
                } catch (error) {
                    cliLogger.error(
                        `❌ Error adding bulk jobs to queue: ${error}`
                    );
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
                        name: "stats",
                        data: {
                            entityType: entityType,
                            entityId: entityId,
                            days: days,
                            priority: 1,
                        },
                    });

                    // When we reach bulk size, add jobs to queue
                    if (bulkJobs.length >= BULK_SIZE) {
                        await flushBulkJobs();
                    }

                    processedCount++;
                    timePeriodsCounters[days] =
                        (timePeriodsCounters[days] || 0) + 1;

                    // Log only every 10000 jobs to avoid log spam, and also log periodically for each time period
                    if (processedCount % 10000 === 0) {
                        cliLogger.info(
                            `✔️ [${processedCount}] Processing ${entityType}s... Time periods progress: ${TIME_PERIODS.map(
                                (days) =>
                                    `${days} days: ${timePeriodsCounters[days]}`
                            ).join(", ")}`
                        );
                    }
                }
            }

            // Process any remaining jobs
            if (bulkJobs.length > 0) {
                await flushBulkJobs();
            }

            const totalPossibleJobs = entityIds.length * TIME_PERIODS.length;
            cliLogger.info(
                `✅ Backfill complete for ${entityType}s. Processed: ${processedCount}/${totalPossibleJobs}`
            );
            cliLogger.info(
                `📊 Stats by time period: ${TIME_PERIODS.map(
                    (days) => `${days} days: ${timePeriodsCounters[days]}`
                ).join(", ")}`
            );
        }

        // Extract all unique entity IDs in a single pass
        const entityIds = await getAllUniqueEntityIdsFromKillmails();

        // Process alliance_ids from killmails
        await queueStatsForEntityIds("alliance_id", entityIds.alliance_id);

        // Process corporation_ids from killmails
        await queueStatsForEntityIds(
            "corporation_id",
            entityIds.corporation_id
        );

        // Process character_ids from killmails
        await queueStatsForEntityIds("character_id", entityIds.character_id);

        cliLogger.info("🎉 All stats backfill processes complete.");
    },
};
