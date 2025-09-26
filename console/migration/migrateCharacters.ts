import prisma from "../../lib/prisma";
import { cliLogger } from "../../server/helpers/Logger";
import { Characters } from "../../server/models/Characters";
import { MigrationHelper } from "./MigrationHelper";
import {
    type MigrationCheckpoint,
    MigrationProgressTracker,
} from "./MigrationProgressTracker";

type CharacterHistory = {
    record_id?: number;
    corporation_id?: number;
    start_date?: Date;
};

type MongoCharacterLean = {
    character_id: number;
    name?: string;
    description?: string;
    birthday?: Date;
    gender?: string;
    race_id?: number;
    security_status?: number;
    bloodline_id?: number;
    corporation_id?: number;
    alliance_id?: number;
    faction_id?: number;
    history?: CharacterHistory[];
    deleted?: boolean;
    error?: string;
    last_active?: Date;
    createdAt?: Date;
    updatedAt?: Date;
};

/**
 * Process a batch of characters and extract normalized data
 */
async function processCharacterBatch(
    characters: MongoCharacterLean[],
    batchNumber: number,
    totalBatches: number,
    checkpoint: MigrationCheckpoint
): Promise<void> {
    // Prepare character data for Prisma batch insert
    const characterData = characters.map((character) => ({
        character_id: character.character_id,
        name: character.name || null,
        description: character.description || null,
        birthday: character.birthday || null,
        gender: character.gender || null,
        race_id: character.race_id || null,
        security_status: character.security_status || null,
        bloodline_id: character.bloodline_id || null,
        corporation_id: character.corporation_id || null,
        alliance_id: character.alliance_id || null,
        faction_id: character.faction_id || null,
        deleted: character.deleted || false,
        error: character.error || null,
        last_active: character.last_active || null,
        created_at: character.createdAt || new Date(),
        updated_at: character.updatedAt || new Date(),
    }));

    // Process character history for this batch
    let historyData: Array<{
        character_id: number;
        record_id: number | null;
        corporation_id: number;
        start_date: Date | null;
    }> = [];

    for (const character of characters) {
        if (character.history && Array.isArray(character.history)) {
            for (const historyEntry of character.history) {
                // Handle missing corporation_id with fallback logic
                let corporationId: number =
                    historyEntry.corporation_id ||
                    character.corporation_id ||
                    character.history.find((h) => h.corporation_id)
                        ?.corporation_id ||
                    1000001; // Default NPC corp as final fallback

                historyData.push({
                    character_id: character.character_id,
                    record_id: historyEntry.record_id || null,
                    corporation_id: corporationId,
                    start_date: historyEntry.start_date || null,
                });
            }
        }
    }

    try {
        // Insert character batch into PostgreSQL
        await prisma.character.createMany({
            data: characterData,
            skipDuplicates: true, // Skip if character_id already exists
        });

        // Insert history batch if there are history records
        if (historyData.length > 0) {
            await prisma.characterHistory.createMany({
                data: historyData,
                skipDuplicates: true,
            });
        }

        // Update checkpoint
        checkpoint.processedRecords += characterData.length;
        checkpoint.lastUpdateTime = Date.now();

        await MigrationProgressTracker.saveProgress(checkpoint);

        cliLogger.info(
            `✅ Batch ${batchNumber}/${totalBatches}: ` +
                `${characterData.length} characters, ${historyData.length} history records`
        );
    } catch (error) {
        cliLogger.error(`❌ Database error in batch ${batchNumber}: ${error}`);
        checkpoint.errorCount += characterData.length;
        throw error;
    }
}

export async function migrateCharacters(
    forceRestart: boolean = false
): Promise<void> {
    try {
        cliLogger.info(
            "🚀 Starting Characters migration with resumable pattern..."
        );

        // Use the resumable migration helper
        await MigrationHelper.processResumableMigration({
            modelName: "characters",
            model: Characters,
            batchSize: 1000,
            processBatch: processCharacterBatch,
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

        cliLogger.info("🎉 Characters migration completed successfully!");
    } catch (error) {
        cliLogger.error(`❌ Migration failed: ${error}`);
        throw error;
    }
}

// Export for CLI usage
if (require.main === module) {
    const forceRestart = process.argv.includes("--force-restart");
    migrateCharacters(forceRestart)
        .then(() => {
            cliLogger.info("✅ Migration script completed");
            process.exit(0);
        })
        .catch((error) => {
            cliLogger.error(`❌ Migration script failed: ${error}`);
            process.exit(1);
        });
}
