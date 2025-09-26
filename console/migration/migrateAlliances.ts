import prisma from "../../lib/prisma";
import { cliLogger } from "../../server/helpers/Logger";
import { Alliances } from "../../server/models/Alliances";
import { MigrationHelper } from "./MigrationHelper";

export async function migrateAlliances(
    options: { force?: boolean; resume?: boolean; restart?: boolean } = {}
) {
    cliLogger.info("Starting Alliance migration from MongoDB to PostgreSQL");

    const batchSize = 1000;

    try {
        // Use the new resumable migration system
        const result = await MigrationHelper.processResumableMigration({
            modelName: "alliances",
            model: Alliances,
            batchSize,
            forceRestart: options.restart,
            processBatch: async (
                batch,
                batchNumber,
                totalBatches,
                checkpoint
            ) => {
                // Transform data for PostgreSQL with proper null handling
                const allianceData = batch.map((alliance) => ({
                    alliance_id: alliance.alliance_id,
                    name: alliance.name || null,
                    ticker: alliance.ticker || null,
                    creator_id: alliance.creator_id || null,
                    creator_corporation_id:
                        alliance.creator_corporation_id || null,
                    executor_corporation_id:
                        alliance.executor_corporation_id || null,
                    date_founded: alliance.date_founded || null,
                    faction_id: alliance.faction_id || null,
                    corporation_count: alliance.corporation_count || null,
                    member_count: alliance.member_count || null,
                    deleted: alliance.deleted || false,
                    created_at: alliance.createdAt || new Date(),
                    updated_at: alliance.updatedAt || new Date(),
                }));

                // Insert batch into PostgreSQL
                await prisma.alliance.createMany({
                    data: allianceData,
                    skipDuplicates: true,
                });
            },
        });

        cliLogger.info(
            `✅ Alliance migration completed. Migrated: ${result.migratedRecords}, Errors: ${result.errorCount}`
        );

        return result;
    } catch (error) {
        cliLogger.error(`❌ Fatal error during alliance migration: ${error}`);
        throw error;
    }
}
