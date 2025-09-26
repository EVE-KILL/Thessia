import { PrismaClient } from "@prisma/client";
import { ObjectId } from "mongodb";
import { cliLogger } from "../../server/helpers/Logger";
import { Stats as MongooseStats } from "../../server/models/Stats";
import { MigrationHelper } from "./MigrationHelper";

const prisma = new PrismaClient();

interface MongoStats {
    _id: ObjectId;
    alliance_id?: number;
    corporation_id?: number;
    character_id?: number;
    type: string;
    kills?: number;
    losses?: number;
    iskDestroyed?: number;
    iskLost?: number;
    efficiency?: number;
    mostUsedShips?: any;
    mostLostShips?: any;
    mostValuableKills?: any[];
    mostValuableShips?: any[];
    mostValuableStructures?: any[];
    topAttackers?: any[];
    topVictims?: any[];
    activityByHour?: any;
    activityByDay?: any;
    lastCalculated?: Date;
    createdAt?: Date;
    updatedAt?: Date;
}

export async function migrateStats(force: boolean = false): Promise<void> {
    try {
        cliLogger.info("Starting Stats migration...");

        // Check if migration already exists
        const existingCount = await prisma.stats.count();
        if (existingCount > 0 && !force) {
            cliLogger.warn(
                `Stats migration already exists (${existingCount} records). Use --force to re-run.`
            );
            return;
        }

        const totalCount = await MigrationHelper.getEstimatedCount(
            MongooseStats
        );
        cliLogger.info(
            `Estimated MongoDB Stats records: ${totalCount.toLocaleString()}`
        );

        if (totalCount === 0) {
            cliLogger.info("No Stats records to migrate");
            return;
        }

        // Clear existing data if force migration
        if (force && existingCount > 0) {
            cliLogger.info("Force migration: clearing existing Stats data...");
            await prisma.stats.deleteMany();
        }

        let processed = 0;
        const batchSize = 1000;

        // Process in batches using standard pattern
        let skip = 0;
        while (skip < totalCount) {
            const batchNumber = Math.floor(skip / batchSize) + 1;
            const totalBatches = Math.ceil(totalCount / batchSize);

            cliLogger.info(
                `Processing batch ${batchNumber}/${totalBatches} - Records ${skip}-${Math.min(
                    skip + batchSize,
                    totalCount
                )}`
            );

            // Fetch batch from MongoDB
            const batch = (await MongooseStats.find({})
                .skip(skip)
                .limit(batchSize)
                .lean()
                .exec()) as any[];

            if (batch.length === 0) {
                break;
            }

            const operations = batch.map((mongoStats) => ({
                alliance_id:
                    MigrationHelper.normalizeValue(
                        mongoStats.alliance_id,
                        "alliance_id"
                    ) || null,
                corporation_id:
                    MigrationHelper.normalizeValue(
                        mongoStats.corporation_id,
                        "corporation_id"
                    ) || null,
                character_id:
                    MigrationHelper.normalizeValue(
                        mongoStats.character_id,
                        "character_id"
                    ) || null,
                type: mongoStats.type || "unknown",
                kills_total: mongoStats.kills || 0,
                losses_total: mongoStats.losses || 0,
                isk_destroyed: mongoStats.iskDestroyed || 0,
                isk_lost: mongoStats.iskLost || 0,
                efficiency: mongoStats.efficiency,

                // JSON fields for complex data structures
                most_used_ships: mongoStats.mostUsedShips || null,
                most_lost_ships: mongoStats.mostLostShips || null,
                most_valuable_kills: mongoStats.mostValuableKills || null,
                most_valuable_ships: mongoStats.mostValuableShips || null,
                most_valuable_structures:
                    mongoStats.mostValuableStructures || null,
                top_attackers: mongoStats.topAttackers || null,
                top_victims: mongoStats.topVictims || null,
                activity_by_hour: mongoStats.activityByHour || null,
                activity_by_day: mongoStats.activityByDay || null,

                last_calculated: mongoStats.lastCalculated || new Date(),
                created_at: mongoStats.createdAt || new Date(),
                updated_at: mongoStats.updatedAt || new Date(),
            }));

            await prisma.stats.createMany({
                data: operations,
                skipDuplicates: true,
            });

            processed += operations.length;
            skip += batchSize;

            // Log progress
            const progressPercent = ((processed / totalCount) * 100).toFixed(1);
            cliLogger.info(
                `Progress: ${processed}/${totalCount} (${progressPercent}%)`
            );
        }

        const finalCount = await prisma.stats.count();
        cliLogger.info(
            `✅ Stats migration completed: ${finalCount.toLocaleString()} records migrated`
        );
    } catch (error) {
        cliLogger.error(`Stats migration failed: ${error}`);
        throw error;
    } finally {
        await prisma.$disconnect();
    }
}
