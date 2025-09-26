import prisma from "../../lib/prisma";
import { cliLogger } from "../../server/helpers/Logger";
import { Corporations } from "../../server/models/Corporations";
import { MigrationHelper } from "./MigrationHelper";

type CorporationHistory = {
    record_id?: number;
    alliance_id?: number;
    start_date?: Date;
};

type MongoCorporationLean = {
    corporation_id: number;
    name?: string;
    ticker?: string;
    description?: string;
    url?: string;
    date_founded?: Date;
    member_count?: number;
    alliance_id?: number;
    faction_id?: number;
    faction_name?: string;
    home_station_id?: number;
    home_station_name?: string;
    shares?: number;
    tax_rate?: number;
    creator_id?: number;
    ceo_id?: number;
    ceo_name?: string;
    war_eligible?: boolean;
    history?: CorporationHistory[];
    deleted?: boolean;
    error?: string;
    createdAt?: Date;
    updatedAt?: Date;
};

/**
 * Process a batch of corporations and return the number of history records processed
 */
async function processCorporationBatch(
    corporations: MongoCorporationLean[]
): Promise<number> {
    // Prepare corporation data for Prisma batch insert
    const corporationData = corporations.map((corp) => ({
        corporation_id: corp.corporation_id,
        name: corp.name || null,
        ticker: corp.ticker || null,
        description: corp.description || null,
        url: corp.url || null,
        date_founded: corp.date_founded || null,
        member_count: corp.member_count || null,
        alliance_id: MigrationHelper.normalizeValue(
            corp.alliance_id,
            "alliance_id"
        ),
        faction_id: MigrationHelper.normalizeValue(
            corp.faction_id,
            "faction_id"
        ),
        home_station_id: MigrationHelper.normalizeValue(
            corp.home_station_id,
            "home_station_id"
        ),
        home_station_name: corp.home_station_name || null,
        shares: corp.shares ? BigInt(corp.shares) : null,
        tax_rate: corp.tax_rate || null,
        creator_id: MigrationHelper.normalizeValue(
            corp.creator_id,
            "creator_id"
        ),
        ceo_id: MigrationHelper.normalizeValue(corp.ceo_id, "ceo_id"),
        ceo_name: corp.ceo_name || null,
        war_eligible: corp.war_eligible ?? false,
        deleted: corp.deleted ?? false,
        error: corp.error || null,
        created_at: corp.createdAt || new Date(),
        updated_at: corp.updatedAt || new Date(),
    }));

    // Batch insert corporations
    await prisma.corporation.createMany({
        data: corporationData,
        skipDuplicates: true,
    });

    // Prepare corporation history data
    let totalHistoryRecords = 0;
    const historyData: any[] = [];

    for (const corp of corporations) {
        if (corp.history && corp.history.length > 0) {
            for (const historyEntry of corp.history) {
                historyData.push({
                    corporation_id: corp.corporation_id,
                    record_id: historyEntry.record_id || null,
                    alliance_id: MigrationHelper.normalizeValue(
                        historyEntry.alliance_id,
                        "alliance_id"
                    ),
                    start_date: historyEntry.start_date || null,
                    created_at: corp.createdAt || new Date(),
                    updated_at: corp.updatedAt || new Date(),
                });
                totalHistoryRecords++;
            }
        }
    }

    // Batch insert corporation history if any exists
    if (historyData.length > 0) {
        await prisma.corporationHistory.createMany({
            data: historyData,
            skipDuplicates: true,
        });
    }

    return totalHistoryRecords;
}

/**
 * Main migration function for corporations
 */
export async function migrateCorporations(
    force: boolean = false
): Promise<void> {
    cliLogger.info("Starting Corporations migration...");

    try {
        // Check if migration already completed
        if (!force) {
            const existingCount = await prisma.corporation.count();
            if (existingCount > 0) {
                cliLogger.warn(
                    `Found ${existingCount} existing corporations. Use --force to overwrite.`
                );
                return;
            }
        }

        // Clear existing data if force flag is used
        if (force) {
            cliLogger.info(
                "Force flag detected, clearing existing corporations..."
            );
            await prisma.corporation.deleteMany();
        }

        // Get total count for progress tracking
        const totalCount = await MigrationHelper.getEstimatedCount(
            Corporations
        );
        cliLogger.info(
            `Processing ~${totalCount.toLocaleString()} corporations...`
        );

        // Initialize progress tracking
        const progress = {
            totalCount,
            migratedRecords: 0,
            errorCount: 0,
            startTime: Date.now(),
        };

        const batchSize = 1000; // Corporations are simpler than characters
        const totalBatches = Math.ceil(totalCount / batchSize);
        cliLogger.info(`Estimated batches: ${totalBatches.toLocaleString()}`);

        let migratedHistoryRecords = 0;

        // Process in batches using MigrationHelper
        const { migratedRecords, errorCount } =
            await MigrationHelper.processBatches<MongoCorporationLean>(
                Corporations,
                totalCount,
                batchSize,
                async (
                    batch: MongoCorporationLean[],
                    batchNumber: number,
                    totalBatches: number
                ) => {
                    const historyCount = await processCorporationBatch(batch);
                    migratedHistoryRecords += historyCount;

                    // Update progress
                    progress.migratedRecords += batch.length;

                    // Log progress every 10 batches
                    if (
                        batchNumber % 10 === 0 ||
                        batchNumber === totalBatches
                    ) {
                        MigrationHelper.logProgress(
                            progress,
                            batch.length,
                            historyCount,
                            "history records"
                        );
                    }
                }
            );

        cliLogger.info(
            `✅ Corporations migration completed! Migrated ${progress.migratedRecords.toLocaleString()} corporations and ${migratedHistoryRecords.toLocaleString()} history records in ${Math.round(
                (Date.now() - progress.startTime) / 1000
            )}s`
        );
    } catch (error) {
        cliLogger.error(`❌ Corporations migration failed: ${error}`);
        throw error;
    }
}
