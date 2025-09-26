import { PrismaClient } from "@prisma/client";
import { connect } from "mongoose";
import { cliLogger } from "../../server/helpers/Logger";
import type { IKillmail } from "../../server/interfaces/IKillmail";
import { Killmails } from "../../server/models/Killmails";
import { MigrationHelper } from "./MigrationHelper";
import {
    type MigrationCheckpoint,
    MigrationProgressTracker,
} from "./MigrationProgressTracker";

const prisma = new PrismaClient();

interface ProcessedKillmail {
    // Core killmail data
    killmail_id: number;
    killmail_hash: string;
    killmail_time: Date;
    solar_system_id: number;
    constellation_id: number | null;
    region_id: number | null;
    total_value: number | null;
    fitting_value: number | null;
    ship_value: number | null;
    processed: boolean;
    is_npc: boolean;
    is_solo: boolean;
    war_id: number | null;
    dna: string | null;
    near: string | null;
}

interface ProcessedVictim {
    killmail_id: number;
    character_id: number | null;
    corporation_id: number | null;
    alliance_id: number | null;
    faction_id: number | null;
    ship_type_id: number;
    ship_group_id: number | null;
    damage_taken: number;
    x: number | null;
    y: number | null;
    z: number | null;
}

interface ProcessedAttacker {
    killmail_id: number;
    character_id: number | null;
    corporation_id: number | null;
    alliance_id: number | null;
    faction_id: number | null;
    ship_type_id: number | null;
    ship_group_id: number | null;
    weapon_type_id: number | null;
    damage_done: number;
    final_blow: boolean;
    security_status: number | null;
}

interface ProcessedItem {
    killmail_id: number;
    parent_item_id: number | null;
    item_type_id: number;
    group_id: number | null;
    category_id: number | null;
    flag: number;
    singleton: number;
    quantity_destroyed: number;
    quantity_dropped: number;
    value: number | null;
}

/**
 * Process a batch of killmails and extract normalized data
 */
async function processKillmailBatch(
    killmails: IKillmail[],
    batchNumber: number,
    totalBatches: number,
    checkpoint: MigrationCheckpoint
): Promise<void> {
    const killmailData: ProcessedKillmail[] = [];
    const victimData: ProcessedVictim[] = [];
    const attackerData: ProcessedAttacker[] = [];
    const itemData: ProcessedItem[] = [];

    let processedInBatch = 0;
    let skippedInBatch = 0;

    for (const killmail of killmails) {
        try {
            // Validate required fields
            if (
                !killmail.killmail_id ||
                !killmail.killmail_hash ||
                !killmail.kill_time
            ) {
                skippedInBatch++;
                cliLogger.warn(
                    `❌ Skipping killmail with missing required fields: ${killmail.killmail_id}`
                );
                continue;
            }

            // Process core killmail data
            killmailData.push({
                killmail_id: killmail.killmail_id,
                killmail_hash: killmail.killmail_hash,
                killmail_time: killmail.kill_time,
                solar_system_id: killmail.system_id,
                constellation_id: killmail.constellation_id || null,
                region_id: killmail.region_id || null,
                total_value: killmail.total_value || null,
                fitting_value: killmail.fitting_value || null,
                ship_value: killmail.ship_value || null,
                processed: true, // MongoDB data is already processed
                is_npc: killmail.is_npc || false,
                is_solo: killmail.is_solo || false,
                war_id: killmail.war_id || null,
                dna: killmail.dna || null,
                near: killmail.near || null,
            });

            // Process victim data
            if (killmail.victim) {
                victimData.push({
                    killmail_id: killmail.killmail_id,
                    character_id: killmail.victim.character_id || null,
                    corporation_id: killmail.victim.corporation_id || null,
                    alliance_id: killmail.victim.alliance_id || null,
                    faction_id: killmail.victim.faction_id || null,
                    ship_type_id: killmail.victim.ship_id,
                    ship_group_id: killmail.victim.ship_group_id || null,
                    damage_taken: killmail.victim.damage_taken,
                    x: killmail.x || null,
                    y: killmail.y || null,
                    z: killmail.z || null,
                });
            }

            // Process attackers
            if (killmail.attackers && Array.isArray(killmail.attackers)) {
                for (const attacker of killmail.attackers) {
                    attackerData.push({
                        killmail_id: killmail.killmail_id,
                        character_id: attacker.character_id || null,
                        corporation_id: attacker.corporation_id || null,
                        alliance_id: attacker.alliance_id || null,
                        faction_id: attacker.faction_id || null,
                        ship_type_id: attacker.ship_id || null,
                        ship_group_id: attacker.ship_group_id || null,
                        weapon_type_id: attacker.weapon_type_id || null,
                        damage_done: attacker.damage_done,
                        final_blow: attacker.final_blow || false,
                        security_status: attacker.security_status || null,
                    });
                }
            }

            // Process items (recursive function for nested items)
            if (killmail.items && Array.isArray(killmail.items)) {
                const processItems = (
                    items: any[],
                    parentItemId: number | null = null
                ) => {
                    for (const item of items) {
                        const itemId = itemData.length + 1; // Simple sequential ID

                        itemData.push({
                            killmail_id: killmail.killmail_id,
                            parent_item_id: parentItemId,
                            item_type_id: item.type_id,
                            group_id: item.group_id || null,
                            category_id: item.category_id || null,
                            flag: item.flag,
                            singleton: item.singleton,
                            quantity_destroyed: item.qty_destroyed || 0,
                            quantity_dropped: item.qty_dropped || 0,
                            value: item.value || null,
                        });

                        // Process nested items
                        if (item.items && Array.isArray(item.items)) {
                            processItems(item.items, itemId);
                        }
                    }
                };
                processItems(killmail.items);
            }

            processedInBatch++;
        } catch (error) {
            skippedInBatch++;
            cliLogger.error(
                `❌ Error processing killmail ${killmail.killmail_id}: ${error}`
            );
        }
    }

    // Batch insert into PostgreSQL with proper error handling
    try {
        // Insert killmails first (parent table)
        if (killmailData.length > 0) {
            await prisma.killmail.createMany({
                data: killmailData,
                skipDuplicates: true,
            });
        }

        // Insert victims
        if (victimData.length > 0) {
            await prisma.killmailVictim.createMany({
                data: victimData,
                skipDuplicates: true,
            });
        }

        // Insert attackers
        if (attackerData.length > 0) {
            await prisma.killmailAttacker.createMany({
                data: attackerData,
                skipDuplicates: true,
            });
        }

        // Insert items
        if (itemData.length > 0) {
            await prisma.killmailItem.createMany({
                data: itemData,
                skipDuplicates: true,
            });
        }

        // Update checkpoint
        checkpoint.processedRecords += processedInBatch;
        checkpoint.errorCount += skippedInBatch;
        checkpoint.lastUpdateTime = Date.now();

        await MigrationProgressTracker.saveProgress(checkpoint);

        cliLogger.info(
            `✅ Batch ${batchNumber}/${totalBatches}: ` +
                `Processed ${processedInBatch}, Skipped ${skippedInBatch} killmails`
        );
        cliLogger.info(
            `   📊 Created: ${killmailData.length} killmails, ${victimData.length} victims, ` +
                `${attackerData.length} attackers, ${itemData.length} items`
        );
    } catch (error) {
        cliLogger.error(`❌ Database error in batch ${batchNumber}: ${error}`);
        checkpoint.errorCount += killmailData.length;
        throw error;
    }
}

export async function migrateKillmails(forceRestart: boolean = false) {
    try {
        cliLogger.info(
            "🚀 Starting Killmails migration to normalized schema..."
        );

        // Connect to MongoDB
        await connect(process.env.MONGO_URI!);
        cliLogger.info("✅ Connected to MongoDB");

        // Connect to Prisma
        await prisma.$connect();
        cliLogger.info("✅ Connected to PostgreSQL via Prisma");

        // Use the resumable migration helper
        await MigrationHelper.processResumableMigration({
            modelName: "killmails",
            model: Killmails,
            batchSize: 500, // Smaller batch size due to complexity
            processBatch: processKillmailBatch,
            forceRestart,
            onProgress: (checkpoint) => {
                const progressPercent = (
                    (checkpoint.processedRecords / checkpoint.totalRecords) *
                    100
                ).toFixed(1);
                const elapsedTime = Date.now() - checkpoint.startTime;
                const avgTimePerRecord =
                    elapsedTime / checkpoint.processedRecords;
                const remainingRecords =
                    checkpoint.totalRecords - checkpoint.processedRecords;
                const estimatedRemainingTime =
                    avgTimePerRecord * remainingRecords;
                const estimatedFinishTime = new Date(
                    Date.now() + estimatedRemainingTime
                );

                cliLogger.info(
                    `📈 Progress: ${checkpoint.processedRecords.toLocaleString()}/${checkpoint.totalRecords.toLocaleString()} ` +
                        `(${progressPercent}%) - ETA: ${estimatedFinishTime.toLocaleTimeString()}`
                );

                if (checkpoint.errorCount > 0) {
                    cliLogger.warn(
                        `⚠️  Errors encountered: ${checkpoint.errorCount}`
                    );
                }
            },
        });

        cliLogger.info("🎉 Killmails migration completed successfully!");
    } catch (error) {
        cliLogger.error(`❌ Migration failed: ${error}`);
        throw error;
    } finally {
        await prisma.$disconnect();
        cliLogger.info("👋 Disconnected from PostgreSQL");
    }
}

// Export for CLI usage
if (require.main === module) {
    const forceRestart = process.argv.includes("--force-restart");
    migrateKillmails(forceRestart)
        .then(() => {
            cliLogger.info("✅ Migration script completed");
            process.exit(0);
        })
        .catch((error) => {
            cliLogger.error(`❌ Migration script failed: ${error}`);
            process.exit(1);
        });
}
