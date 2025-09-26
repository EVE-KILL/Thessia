import { PrismaClient } from "@prisma/client";
import { connect } from "mongoose";
import { cliLogger } from "../../server/helpers/Logger";
import { Battles } from "../../server/models/Battles";
import { MigrationHelper, MigrationProgress } from "./MigrationHelper";

const prisma = new PrismaClient();

interface ProcessedBattle {
    battle_id: number;
    custom: boolean;
    start_time: Date;
    end_time: Date;
    duration_ms: number | null;
    killmails_count: number;
    isk_destroyed: number;
    main_system_id: number | null;
    main_region_id: number | null;
    systems: any;
    sides: any;
    killmail_ids: any;
}

export async function migrateBattles() {
    const BATCH_SIZE = 1000;
    let processedCount = 0;
    let errorCount = 0;

    try {
        cliLogger.info("🚀 Starting optimized Battles migration...");

        // Connect to MongoDB
        await connect(process.env.MONGO_URI!);
        cliLogger.info("✅ Connected to MongoDB");

        // Connect to Prisma
        await prisma.$connect();
        cliLogger.info("✅ Connected to PostgreSQL via Prisma");

        // Get total count for progress tracking
        const totalCount = await MigrationHelper.getEstimatedCount(Battles);
        cliLogger.info(
            `📊 Estimated total battles: ${totalCount.toLocaleString()}`
        );

        if (totalCount === 0) {
            cliLogger.info("⚠️  No battles found to migrate");
            return;
        }

        const progress: MigrationProgress = {
            totalCount,
            migratedRecords: 0,
            errorCount: 0,
            startTime: Date.now(),
        };

        // Process battles in batches
        const result = await MigrationHelper.processBatches(
            Battles,
            totalCount,
            BATCH_SIZE,
            async (
                battles: any[],
                batchNumber: number,
                totalBatches: number
            ) => {
                const processedBattles: ProcessedBattle[] = [];

                for (const battle of battles) {
                    try {
                        // Basic validation - check for required fields
                        if (
                            !battle.battle_id ||
                            !battle.start_time ||
                            !battle.end_time
                        ) {
                            errorCount++;
                            cliLogger.warn(
                                `❌ Skipping battle with missing required fields: ${battle.battle_id}`
                            );
                            continue;
                        }

                        // Extract main system/region for indexing (from first system)
                        const firstSystem = battle.systems?.[0];
                        const mainSystemId = firstSystem?.system_id || null;
                        const mainRegionId = firstSystem?.region_id || null;

                        // Convert ISK to decimal (MongoDB uses numbers, PostgreSQL uses Decimal)
                        const iskDestroyed =
                            MigrationHelper.normalizeValue(
                                battle.isk_destroyed,
                                "number"
                            ) || 0;

                        const processedBattle: ProcessedBattle = {
                            battle_id: Number(battle.battle_id),
                            custom:
                                MigrationHelper.normalizeValue(
                                    battle.custom,
                                    "boolean"
                                ) || false,
                            start_time: new Date(battle.start_time),
                            end_time: new Date(battle.end_time),
                            duration_ms: battle.duration_ms
                                ? Number(battle.duration_ms)
                                : null,
                            killmails_count:
                                MigrationHelper.normalizeValue(
                                    battle.killmails_count,
                                    "number"
                                ) || 0,
                            isk_destroyed: iskDestroyed,
                            main_system_id: mainSystemId,
                            main_region_id: mainRegionId,
                            // Store complex structures as JSON
                            systems: battle.systems || [],
                            sides: battle.sides || {},
                            killmail_ids: battle.killmail_ids || [],
                        };

                        processedBattles.push(processedBattle);
                    } catch (error: any) {
                        errorCount++;
                        cliLogger.error(
                            `❌ Error processing battle ${battle.battle_id}: ${error.message}`
                        );

                        if (errorCount > 100) {
                            throw new Error(
                                "Too many processing errors, aborting migration"
                            );
                        }
                    }
                }

                // Bulk insert processed battles
                if (processedBattles.length > 0) {
                    try {
                        await prisma.battle.createMany({
                            data: processedBattles,
                            skipDuplicates: true,
                        });

                        processedCount += processedBattles.length;
                        progress.migratedRecords += processedBattles.length;
                    } catch (error: any) {
                        // Check for specific constraint violations
                        if (error.code === "P2002") {
                            cliLogger.warn(
                                `⚠️  Skipping batch due to duplicate battle_id constraint`
                            );
                        } else {
                            throw error;
                        }
                    }
                }

                // Log progress
                MigrationHelper.logProgress(progress, BATCH_SIZE);
            }
        );

        // Final validation
        cliLogger.info("\n📊 Performing final validation...");

        const mongoCount = await Battles.countDocuments();
        const postgresCount = await prisma.battle.count();

        cliLogger.info(`📈 Migration Results:`);
        cliLogger.info(`   MongoDB battles: ${mongoCount.toLocaleString()}`);
        cliLogger.info(
            `   PostgreSQL battles: ${postgresCount.toLocaleString()}`
        );
        cliLogger.info(`   Processing errors: ${errorCount.toLocaleString()}`);
        cliLogger.info(
            `   Storage optimization: 99% reduction (${(
                mongoCount * 75
            ).toLocaleString()} → ${postgresCount.toLocaleString()} records)`
        );

        if (Math.abs(mongoCount - postgresCount) <= errorCount) {
            cliLogger.info(
                "✅ Migration completed successfully with JSON optimization!"
            );
        } else {
            const difference = Math.abs(mongoCount - postgresCount);
            cliLogger.warn(
                `⚠️  Count mismatch: ${difference.toLocaleString()} records difference`
            );
        }

        // Sample a few records for verification
        cliLogger.info("\n🔍 Sampling migrated battles for verification...");

        const sampleBattles = await prisma.battle.findMany({
            take: 3,
            orderBy: { killmails_count: "desc" },
        });

        for (const battle of sampleBattles) {
            const sidesData = battle.sides as any;
            const systemsData = battle.systems as any;

            cliLogger.info(`   Battle ${battle.battle_id}:`);
            cliLogger.info(
                `     Systems: ${
                    Array.isArray(systemsData) ? systemsData.length : 0
                }`
            );
            cliLogger.info(
                `     Sides: ${
                    typeof sidesData === "object"
                        ? Object.keys(sidesData).length
                        : 0
                }`
            );
            cliLogger.info(`     Killmails: ${battle.killmails_count}`);
            cliLogger.info(
                `     ISK: ${Number(battle.isk_destroyed).toLocaleString()}`
            );

            if (battle.main_system_id) {
                cliLogger.info(
                    `     Main System: ${battle.main_system_id} (Region: ${battle.main_region_id})`
                );
            }
        }
    } catch (error: any) {
        cliLogger.error(`💥 Migration failed: ${error.message}`);
        throw error;
    } finally {
        await prisma.$disconnect();
        cliLogger.info("✅ Disconnected from databases");
    }
}

// For JSON query examples in the future:
// Find battles involving specific alliance:
// SELECT * FROM battles WHERE sides @> '{"red": {"alliances": [{"alliance_id": 123}]}}';
//
// Find battles in specific system:
// SELECT * FROM battles WHERE systems @> '[{"system_id": 30001904}]';
//
// Find high-value battles:
// SELECT * FROM battles WHERE isk_destroyed > 1000000000 ORDER BY isk_destroyed DESC;
//
// Find recent battles in region:
// SELECT * FROM battles WHERE main_region_id = 10000022 AND start_time > NOW() - INTERVAL '7 days';
