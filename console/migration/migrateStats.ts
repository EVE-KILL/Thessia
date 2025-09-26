import { PrismaClient } from "@prisma/client";
import { ObjectId } from "mongodb";
import { cliLogger } from "../../server/helpers/Logger";
import { Stats as MongooseStats } from "../../server/models/Stats";
import { MigrationHelper } from "./MigrationHelper";

const prisma = new PrismaClient();

interface MongoStats {
    _id: ObjectId;
    type: "character_id" | "corporation_id" | "alliance_id";
    id: number;
    days: number;
    kills?: number;
    losses?: number;
    iskKilled?: number;
    iskLost?: number;
    npcLosses?: number;
    soloKills?: number;
    soloLosses?: number;
    lastActive?: Date;
    full?: {
        mostUsedShips?: any;
        mostLostShips?: any;
        mostValuableKills?: any[];
        mostValuableShips?: any[];
        mostValuableStructures?: any[];
        topCharacters?: any[];
        topCorporations?: any[];
        topShips?: any[];
        topSystems?: any[];
        topConstellations?: any[];
        topRegions?: any[];
        shipGroupStats?: any[];
        monthlyStats?: any[];
        diesToCorporations?: any;
        diesToAlliances?: any;
        blobFactor?: number;
        heatMap?: any;
        fliesWithCorporations?: any;
        fliesWithAlliances?: any;
        sameShipAsOtherAttackers?: number;
        possibleFC?: boolean;
        possibleCynoAlt?: boolean;
    };
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

            const operations = batch
                .filter((mongoStats) => {
                    // Skip records without valid entity ID
                    return (
                        mongoStats.type && mongoStats.id && mongoStats.id > 0
                    );
                })
                .map((mongoStats) => {
                    // Map the entity type and ID correctly
                    let entityType: string;
                    let alliance_id: number | null = null;
                    let corporation_id: number | null = null;
                    let character_id: number | null = null;

                    switch (mongoStats.type) {
                        case "character_id":
                            entityType = "character";
                            character_id = mongoStats.id;
                            break;
                        case "corporation_id":
                            entityType = "corporation";
                            corporation_id = mongoStats.id;
                            break;
                        case "alliance_id":
                            entityType = "alliance";
                            alliance_id = mongoStats.id;
                            break;
                        default:
                            entityType = "unknown";
                    }

                    // Calculate efficiency if we have both destroyed and lost
                    const iskDestroyed = mongoStats.iskKilled || 0;
                    const iskLost = mongoStats.iskLost || 0;
                    const efficiency =
                        iskDestroyed + iskLost > 0
                            ? (iskDestroyed / (iskDestroyed + iskLost)) * 100
                            : undefined;

                    return {
                        alliance_id,
                        corporation_id,
                        character_id,
                        entity_type: entityType,
                        entity_id: mongoStats.id,
                        kills: mongoStats.kills || 0,
                        losses: mongoStats.losses || 0,
                        total_damage_done: null, // Not available in old stats
                        total_damage_received: null, // Not available in old stats
                        total_isk_destroyed: iskDestroyed,
                        total_isk_lost: iskLost,
                        last_kill_date: null, // Not available in old stats
                        last_loss_date: mongoStats.lastActive || null,
                        efficiency: efficiency,
                        avg_gang_size: null, // Not available in old stats
                        solo_kills: mongoStats.soloKills || 0,
                        solo_losses: mongoStats.soloLosses || 0,
                        solo_percentage:
                            mongoStats.soloKills && (mongoStats.kills || 0) > 0
                                ? (mongoStats.soloKills /
                                      (mongoStats.kills || 1)) *
                                  100
                                : null,

                        // Store complex data as JSON
                        ships_used: mongoStats.full?.mostUsedShips || null,
                        ships_lost: mongoStats.full?.mostLostShips || null,
                        most_used_ship: null, // Can be calculated from ships_used
                        most_lost_ship: null, // Can be calculated from ships_lost
                        top_victims: mongoStats.full?.topCharacters || null,
                        top_attackers: null, // Not directly available
                        monthly_stats: mongoStats.full?.monthlyStats || null,
                        weekly_stats: null, // Not available in old stats
                        daily_stats: null, // Not available in old stats
                        recent_activity: null, // Not available in old stats
                        full_stats: mongoStats.full || null,

                        created_at: mongoStats.createdAt || new Date(),
                        updated_at: mongoStats.updatedAt || new Date(),
                    };
                });

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
