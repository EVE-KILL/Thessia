import prisma from "../../lib/prisma";
import { cliLogger } from "../../server/helpers/Logger";
import { Characters } from "../../server/models/Characters";
import { MigrationHelper } from "./MigrationHelper";

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
 * Process a batch of characters and return the number of history records processed
 */
async function processCharacterBatch(
    characters: MongoCharacterLean[]
): Promise<number> {
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

    // Insert character batch into PostgreSQL
    await prisma.character.createMany({
        data: characterData,
        skipDuplicates: true, // Skip if character_id already exists
    });

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

    // Insert history batch if there are history records
    if (historyData.length > 0) {
        await prisma.characterHistory.createMany({
            data: historyData,
            skipDuplicates: true,
        });
    }

    return historyData.length;
}

export async function migrateCharacters(): Promise<void> {
    cliLogger.info("Starting Character migration from MongoDB to PostgreSQL");

    try {
        // Get estimated count for much faster startup
        const totalCount = await MigrationHelper.getEstimatedCount(Characters);
        cliLogger.info(
            `Total characters to migrate: ${totalCount.toLocaleString()}`
        );

        const batchSize = 1000; // Larger batches for better throughput
        const totalBatches = Math.ceil(totalCount / batchSize);
        cliLogger.info(`Estimated batches: ${totalBatches.toLocaleString()}`);

        let migratedHistoryRecords = 0;
        const startTime = Date.now();

        // Use the helper for batch processing
        const { migratedRecords, errorCount } =
            await MigrationHelper.processBatches<MongoCharacterLean>(
                Characters,
                totalCount,
                batchSize,
                async (
                    batch: MongoCharacterLean[],
                    batchNumber: number,
                    totalBatches: number
                ) => {
                    const historyCount = await processCharacterBatch(batch);
                    migratedHistoryRecords += historyCount;

                    // Log progress with history count
                    MigrationHelper.logProgress(
                        {
                            totalCount,
                            migratedRecords: batchNumber * batchSize,
                            errorCount: 0,
                            startTime,
                        },
                        batch.length,
                        historyCount,
                        "history records"
                    );
                }
            );

        cliLogger.info(
            `Character migration completed. Characters: ${migratedRecords}, History Records: ${migratedHistoryRecords}, Errors: ${errorCount}`
        );
    } catch (error) {
        cliLogger.error(`Fatal error during character migration: ${error}`);
        throw error;
    }
}
