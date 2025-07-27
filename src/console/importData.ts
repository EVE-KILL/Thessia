import { cliLogger } from "~/server/helpers/Logger";
import { Config } from "~/server/models/Config";

// Import all the available models that match the export API
import { Alliances } from "~/server/models/Alliances";
import { Battles } from "~/server/models/Battles";
import { Bloodlines } from "~/server/models/Bloodlines";
import { Campaigns } from "~/server/models/Campaigns";
import { Celestials } from "~/server/models/Celestials";
import { CharacterAchievements } from "~/server/models/CharacterAchievements";
import { Characters } from "~/server/models/Characters";
import { Comments } from "~/server/models/Comments";
import { Constellations } from "~/server/models/Constellations";
import { Corporations } from "~/server/models/Corporations";
import { CustomPrices } from "~/server/models/CustomPrices";
import { Factions } from "~/server/models/Factions";
import { HistoricalStats } from "~/server/models/HistoricalStats";
import { InvFlags } from "~/server/models/InvFlags";
import { InvGroups } from "~/server/models/InvGroups";
import { InvTypes } from "~/server/models/InvTypes";
import { Killmails } from "~/server/models/Killmails";
import { KillmailsESI } from "~/server/models/KillmailsESI";
import { Prices } from "~/server/models/Prices";
import { Races } from "~/server/models/Races";
import { Regions } from "~/server/models/Regions";
import { SolarSystems } from "~/server/models/SolarSystems";
import { Stats } from "~/server/models/Stats";
import { Wars } from "~/server/models/Wars";

import type { Model } from "mongoose";

interface IExportCollectionInfo {
    collection: string;
    estimatedCount: number;
    rateLimits: Record<
        string,
        { requestsPerSecond: number; maxBurstRequests: number }
    >;
}

interface IExportResult {
    collection: string;
    limit: number;
    after?: string;
    before?: string;
    count: number;
    data: any[];
}

interface IImportProgress {
    collection: string;
    lastId?: string;
    imported: number;
    total: number;
    completed: boolean;
}

interface IImportOptions {
    url: string;
    collections: string[];
    delay: number;
    dryRun: boolean;
    batchSize: number;
}

interface IProgressBar {
    current: number;
    total: number;
    startTime: number;
    collection: string;
}

// Map collection names to their models
const COLLECTION_MODELS: Record<string, Model<any>> = {
    alliances: Alliances,
    battles: Battles,
    bloodlines: Bloodlines,
    campaigns: Campaigns,
    celestials: Celestials,
    characterachievements: CharacterAchievements,
    characters: Characters,
    comments: Comments,
    constellations: Constellations,
    corporations: Corporations,
    customprices: CustomPrices,
    factions: Factions,
    historicalstats: HistoricalStats,
    invflags: InvFlags,
    invgroups: InvGroups,
    invtypes: InvTypes,
    killmails: Killmails,
    killmailsesi: KillmailsESI,
    prices: Prices,
    races: Races,
    regions: Regions,
    solarsystems: SolarSystems,
    stats: Stats,
    wars: Wars,
};

export default {
    name: "importData",
    description:
        "Import data from a remote Thessia instance using the export API",
    longRunning: true,
    options: [
        {
            flags: "-u, --url <url>",
            description: "Source URL to import from",
            defaultValue: "https://eve-kill.com",
        },
        {
            flags: "-c, --collections <list>",
            description: "Comma-separated list of collections to import",
            defaultValue: "all",
        },
        {
            flags: "-d, --delay <ms>",
            description: "Delay between requests in milliseconds",
            defaultValue: "200",
        },
        {
            flags: "--dry-run",
            description: "Test mode - fetch data but don't write to database",
            defaultValue: false,
        },
        {
            flags: "-b, --batch-size <size>",
            description: "Number of documents to fetch per request",
            defaultValue: "1000",
        },
    ],
    examples: [
        "bin/console importData                                        # Import all collections from eve-kill.com",
        "bin/console importData --dry-run                              # Test mode, don't write to database",
        "bin/console importData -u https://custom.domain.com           # Import from custom URL",
        'bin/console importData -c "alliances,corporations"            # Import only specific collections',
        "bin/console importData -d 500 -b 500                          # Slower with smaller batches",
    ],
    run: async (args: string[] = [], cmdOptions: any = {}) => {
        // Use options from Commander.js directly
        const options: IImportOptions = {
            url: cmdOptions.url || "https://eve-kill.com",
            collections: cmdOptions.collections
                ? cmdOptions.collections
                      .split(",")
                      .map((c: string) => c.trim().toLowerCase())
                : [],
            delay: parseInt(cmdOptions.delay || "200", 10),
            dryRun: cmdOptions.dryRun || false,
            batchSize: parseInt(cmdOptions.batchSize || "1000", 10),
        };

        // Normalize URL (remove trailing slash)
        options.url = options.url.replace(/\/$/, "");

        cliLogger.info("🚀 Starting data import from remote Thessia instance");
        cliLogger.info(`📡 Source URL: ${options.url}`);
        cliLogger.info(`⏱️  Delay between requests: ${options.delay}ms`);
        cliLogger.info(`📦 Batch size: ${options.batchSize}`);
        if (options.dryRun) {
            cliLogger.info(
                "🧪 DRY RUN MODE - No data will be written to database"
            );
        }
        if (options.collections.length > 0) {
            cliLogger.info(
                `📋 Target collections: ${options.collections.join(", ")}`
            );
        }

        try {
            let collectionsToImport: string[] = [];

            if (options.collections.length > 0) {
                collectionsToImport = options.collections;
                cliLogger.info(
                    `📋 Using specified collections: ${collectionsToImport.join(
                        ", "
                    )}`
                );
            } else {
                // Discover available collections from the API
                const collections = await discoverCollections(options.url);
                collectionsToImport = collections.map((c) => c.collection);
                cliLogger.info(
                    `🔍 Discovered ${
                        collectionsToImport.length
                    } collections: ${collectionsToImport.join(", ")}`
                );
            }

            // Filter out collections we don't have models for
            const validCollections = collectionsToImport.filter(
                (collection) => COLLECTION_MODELS[collection]
            );
            const invalidCollections = collectionsToImport.filter(
                (collection) => !COLLECTION_MODELS[collection]
            );

            if (invalidCollections.length > 0) {
                cliLogger.warn(
                    `⚠️  Skipping unknown collections: ${invalidCollections.join(
                        ", "
                    )}`
                );
            }

            if (validCollections.length === 0) {
                throw new Error("❌ No valid collections to import");
            }

            cliLogger.info(
                `✅ Will import ${
                    validCollections.length
                } collections: ${validCollections.join(", ")}`
            );

            // Import each collection
            let totalImported = 0;
            for (const collection of validCollections) {
                const imported = await importCollection(options, collection);
                totalImported += imported;
                cliLogger.info(
                    `✅ Completed import of '${collection}': ${imported} documents`
                );
            }

            cliLogger.info(
                `🎉 Data import completed successfully! Total documents imported: ${totalImported}`
            );
            return {
                result: `Import completed. ${totalImported} documents imported from ${validCollections.length} collections.`,
            };
        } catch (error) {
            cliLogger.error(`❌ Error during data import: ${error}`);
            throw error;
        }
    },
};

/**
 * Discover available collections from the export API
 */
async function discoverCollections(
    sourceUrl: string
): Promise<IExportCollectionInfo[]> {
    const response = await fetch(`${sourceUrl}/api/export`);
    if (!response.ok) {
        throw new Error(
            `Failed to discover collections: ${response.status} ${response.statusText}`
        );
    }

    const collections: IExportCollectionInfo[] = await response.json();
    return collections;
}

/**
 * Import a single collection with pagination
 */
async function importCollection(
    options: IImportOptions,
    collection: string
): Promise<number> {
    const model = COLLECTION_MODELS[collection];
    if (!model) {
        throw new Error(`No model found for collection: ${collection}`);
    }

    let totalImported = 0;
    let after: string | undefined;

    // Get progress from config if resuming (only in real mode, not dry-run)
    let progress: IImportProgress = {
        collection,
        imported: 0,
        total: 0,
        completed: false,
    };

    if (!options.dryRun) {
        const progressConfig = await Config.findOne({
            key: `import_progress_${collection}`,
        });
        if (progressConfig?.value) {
            progress = JSON.parse(progressConfig.value);
        }

        if (progress.completed) {
            cliLogger.info(
                `⏭️  Collection '${collection}' already completed (${progress.imported} documents). Skipping.`
            );
            return progress.imported;
        }

        if (progress.lastId) {
            after = progress.lastId;
            totalImported = progress.imported;
            cliLogger.info(
                `🔄 Resuming import of '${collection}' from ID: ${after} (${totalImported} already imported)`
            );
        } else {
            cliLogger.info(`🆕 Starting fresh import of '${collection}'`);
        }
    } else {
        cliLogger.info(`🧪 DRY RUN: Testing import of '${collection}'`);
    }

    let hasMoreData = true;
    let batchCount = 0;

    while (hasMoreData) {
        try {
            // Build the request URL
            let url = `${options.url}/api/export/${collection}?limit=${options.batchSize}`;
            if (after) {
                url += `&after=${after}`;
            }

            // Progress display (simple logging)
            if (totalImported % 1000 === 0 || batchCount === 1) {
                cliLogger.info(
                    `📊 Progress for ${collection}: ${totalImported.toLocaleString()} documents imported`
                );
            }

            // Fetch the batch
            cliLogger.info(
                `📥 Fetching batch ${++batchCount} from: ${collection}${
                    after ? ` (after: ${after})` : " (start)"
                }`
            );
            const response = await fetch(url);

            if (!response.ok) {
                // Check if it's a rate limit error
                if (response.status === 429) {
                    const retryAfter =
                        response.headers.get("Retry-After") || "5";
                    cliLogger.warn(
                        `⏸️  Rate limited. Waiting ${retryAfter} seconds...`
                    );
                    await sleep(parseInt(retryAfter) * 1000);
                    continue; // Retry the same request
                }
                throw new Error(
                    `Failed to fetch data: ${response.status} ${response.statusText}`
                );
            }

            const batch: IExportResult = await response.json();

            if (batch.data.length === 0) {
                cliLogger.info(`📭 No more data available for '${collection}'`);
                hasMoreData = false;
                break;
            }

            cliLogger.info(
                `📦 Retrieved ${batch.data.length} documents from '${collection}'`
            );

            if (!options.dryRun) {
                // Process the batch in smaller chunks for upserting
                const upsertBatchSize = 500;
                const chunks = chunkArray(batch.data, upsertBatchSize);
                let batchImported = 0;

                for (const chunk of chunks) {
                    const operations = chunk.map((doc) => ({
                        updateOne: {
                            filter: { _id: doc._id },
                            update: { $set: doc },
                            upsert: true,
                        },
                    }));

                    try {
                        const result = await model.bulkWrite(operations, {
                            ordered: false,
                        });
                        const imported =
                            result.upsertedCount + result.modifiedCount;
                        batchImported += imported;
                        totalImported += imported;

                        if (
                            result.upsertedCount > 0 ||
                            result.modifiedCount > 0
                        ) {
                            cliLogger.info(
                                `💾 Upserted ${imported} documents in '${collection}' (${totalImported} total)`
                            );
                        }
                    } catch (bulkError: any) {
                        // Handle bulk write errors gracefully
                        if (bulkError.writeErrors) {
                            const errorCount = bulkError.writeErrors.length;
                            const successCount = chunk.length - errorCount;
                            batchImported += successCount;
                            totalImported += successCount;
                            cliLogger.warn(
                                `⚠️  Partial success: ${successCount}/${chunk.length} documents processed, ${errorCount} errors in '${collection}'`
                            );
                        } else {
                            throw bulkError;
                        }
                    }
                }

                // Update progress only in real mode
                progress = {
                    collection,
                    lastId: after,
                    imported: totalImported,
                    total: progress.total,
                    completed: false,
                };

                await Config.updateOne(
                    { key: `import_progress_${collection}` },
                    { $set: { value: JSON.stringify(progress) } },
                    { upsert: true }
                );
            } else {
                // In dry-run mode, just count the documents
                totalImported += batch.data.length;
                cliLogger.info(
                    `🧪 DRY RUN: Would have imported ${batch.data.length} documents (${totalImported} total)`
                );
            }

            // Update the cursor for next iteration
            const lastDoc = batch.data[batch.data.length - 1];
            after = lastDoc._id;

            // Check if we got fewer documents than requested (end of data)
            if (batch.data.length < options.batchSize) {
                cliLogger.info(
                    `🏁 Reached end of data for '${collection}' (batch size: ${batch.data.length} < ${options.batchSize})`
                );
                hasMoreData = false;
            }

            // Delay between batches (respect rate limiting)
            if (hasMoreData) {
                await sleep(options.delay);
            }
        } catch (error) {
            cliLogger.error(
                `❌ Error processing batch for '${collection}': ${error}`
            );

            // Save progress before potentially rethrowing (only in real mode)
            if (!options.dryRun) {
                await Config.updateOne(
                    { key: `import_progress_${collection}` },
                    { $set: { value: JSON.stringify(progress) } },
                    { upsert: true }
                );
            }

            throw error;
        }
    }

    // Mark as completed (only in real mode)
    if (!options.dryRun) {
        progress.completed = true;
        await Config.updateOne(
            { key: `import_progress_${collection}` },
            { $set: { value: JSON.stringify(progress) } },
            { upsert: true }
        );
    }

    return totalImported;
}

/**
 * Split an array into chunks of specified size
 */
function chunkArray<T>(array: T[], chunkSize: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += chunkSize) {
        chunks.push(array.slice(i, i + chunkSize));
    }
    return chunks;
}

/**
 * Sleep for the specified number of milliseconds
 */
function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}
