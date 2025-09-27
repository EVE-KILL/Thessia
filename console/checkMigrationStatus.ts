import prisma from "../lib/prisma";
import { cliLogger } from "../server/helpers/Logger";
import { MigrationProgressTracker } from "./migration/MigrationProgressTracker";

// Import all the models we need to check
import { Alliances } from "../server/models/Alliances";
import { ApiKeys } from "../server/models/ApiKeys";
import { Battles } from "../server/models/Battles";
import { Campaigns } from "../server/models/Campaigns";
import { CharacterAchievements } from "../server/models/CharacterAchievements";
import { Characters } from "../server/models/Characters";
import { Comments } from "../server/models/Comments";
import { Config } from "../server/models/Config";
import { Corporations } from "../server/models/Corporations";
import { CustomPrices } from "../server/models/CustomPrices";
import { DScan } from "../server/models/DScan";
import { Killmails } from "../server/models/Killmails";
import { Prices } from "../server/models/Prices";
import { Sovereignty } from "../server/models/Sovereignty";
import { Stats } from "../server/models/Stats";
import { Users } from "../server/models/Users";
import { Wars } from "../server/models/Wars";
import { Bloodlines } from "../server/models/Bloodlines";
import { Celestials } from "../server/models/Celestials";
import { Constellations } from "../server/models/Constellations";
import { Factions } from "../server/models/Factions";
import { InvFlags } from "../server/models/InvFlags";
import { InvGroups } from "../server/models/InvGroups";
import { InvTypes } from "../server/models/InvTypes";
import { LocalScan } from "../server/models/LocalScan";
import { Races } from "../server/models/Races";
import { Regions } from "../server/models/Regions";
import { SolarSystems } from "../server/models/SolarSystems";

interface ModelMapping {
    name: string;
    mongoModel: any;
    prismaTable: string;
    displayName: string;
}

const MODEL_MAPPINGS: ModelMapping[] = [
    {
        name: "alliances",
        mongoModel: Alliances,
        prismaTable: "alliance",
        displayName: "Alliances",
    },
    {
        name: "battles",
        mongoModel: Battles,
        prismaTable: "battle",
        displayName: "Battles",
    },
    {
        name: "campaigns",
        mongoModel: Campaigns,
        prismaTable: "campaign",
        displayName: "Campaigns",
    },
    {
        name: "characterAchievements",
        mongoModel: CharacterAchievements,
        prismaTable: "characterAchievements",
        displayName: "Character Achievements",
    },
    {
        name: "characters",
        mongoModel: Characters,
        prismaTable: "character",
        displayName: "Characters",
    },
    {
        name: "comments",
        mongoModel: Comments,
        prismaTable: "comment",
        displayName: "Comments",
    },
    {
        name: "corporations",
        mongoModel: Corporations,
        prismaTable: "corporation",
        displayName: "Corporations",
    },
    {
        name: "customPrices",
        mongoModel: CustomPrices,
        prismaTable: "customPrice",
        displayName: "Custom Prices",
    },
    {
        name: "dscan",
        mongoModel: DScan,
        prismaTable: "dScan",
        displayName: "D-Scan",
    },
    {
        name: "killmails",
        mongoModel: Killmails,
        prismaTable: "killmail",
        displayName: "Killmails",
    },
    {
        name: "prices",
        mongoModel: Prices,
        prismaTable: "price",
        displayName: "Prices",
    },
    {
        name: "stats",
        mongoModel: Stats,
        prismaTable: "stats",
        displayName: "Stats",
    },
    {
        name: "users",
        mongoModel: Users,
        prismaTable: "user",
        displayName: "Users",
    },
    {
        name: "wars",
        mongoModel: Wars,
        prismaTable: "war",
        displayName: "Wars",
    },
    {
        name: "sovereignty",
        mongoModel: Sovereignty,
        prismaTable: "sovereignty",
        displayName: "Sovereignty",
    },
    {
        name: "apiKeys",
        mongoModel: ApiKeys,
        prismaTable: "apiKey",
        displayName: "API Keys",
    },
    {
        name: "config",
        mongoModel: Config,
        prismaTable: "config",
        displayName: "Config",
    },
    {
        name: "bloodlines",
        mongoModel: Bloodlines,
        prismaTable: "bloodline",
        displayName: "Bloodlines",
    },
    {
        name: "celestials",
        mongoModel: Celestials,
        prismaTable: "celestial",
        displayName: "Celestials",
    },
    {
        name: "constellations",
        mongoModel: Constellations,
        prismaTable: "constellation",
        displayName: "Constellations",
    },
    {
        name: "factions",
        mongoModel: Factions,
        prismaTable: "faction",
        displayName: "Factions",
    },
    {
        name: "invFlags",
        mongoModel: InvFlags,
        prismaTable: "invFlag",
        displayName: "Inventory Flags",
    },
    {
        name: "invGroups",
        mongoModel: InvGroups,
        prismaTable: "invGroup",
        displayName: "Inventory Groups",
    },
    {
        name: "invTypes",
        mongoModel: InvTypes,
        prismaTable: "invType",
        displayName: "Inventory Types",
    },
    {
        name: "localScans",
        mongoModel: LocalScan,
        prismaTable: "localScan",
        displayName: "Local Scans",
    },
    {
        name: "races",
        mongoModel: Races,
        prismaTable: "race",
        displayName: "Races",
    },
    {
        name: "regions",
        mongoModel: Regions,
        prismaTable: "region",
        displayName: "Regions",
    },
    {
        name: "solarSystems",
        mongoModel: SolarSystems,
        prismaTable: "solarSystem",
        displayName: "Solar Systems",
    },
];

const MONGO_COUNT_TIMEOUT_MS = 5000;

async function checkMigrationStatus(options: {
    model?: string;
    all?: boolean;
}) {
    const { model, all } = options;

    cliLogger.info("=== Migration Status ===");

    if (model) {
        // Check specific model
        await checkSpecificModel(model);
    } else if (all) {
        // Check all models with detailed counts
        await checkAllModelsDetailed();
    } else {
        // Default: show overview of all migrations
        await showMigrationOverview();
    }
}

async function checkSpecificModel(modelName: string) {
    const mapping = MODEL_MAPPINGS.find(
        (m) => m.name.toLowerCase() === modelName.toLowerCase()
    );

    if (!mapping) {
        cliLogger.error(`Unknown model: ${modelName}`);
        cliLogger.info(
            `Available models: ${MODEL_MAPPINGS.map((m) => m.name).join(", ")}`
        );
        return;
    }

    // Check migration progress first
    const summary = await MigrationProgressTracker.getProgressSummary(
        modelName
    );
    if (summary) {
        cliLogger.info(summary);
    }

    // Show database counts
    await showDatabaseCountsForModel(mapping);
}

async function checkAllMigrations() {
    const activeMigrations =
        await MigrationProgressTracker.listActiveMigrations();

    if (activeMigrations.length === 0) {
        cliLogger.info("No active migrations found");
    } else {
        cliLogger.info(`Found ${activeMigrations.length} active migration(s):`);

        for (const migrationModel of activeMigrations) {
            const summary = await MigrationProgressTracker.getProgressSummary(
                migrationModel
            );
            if (summary) {
                cliLogger.info(`\n${summary}`);
            }
        }
    }
}

async function checkAllModelsDetailed() {
    cliLogger.info("\n=== Detailed Migration Status for All Models ===");

    for (const mapping of MODEL_MAPPINGS) {
        cliLogger.info(`\n--- ${mapping.displayName} ---`);

        // Check for active migration
        const summary = await MigrationProgressTracker.getProgressSummary(
            mapping.name
        );
        if (summary) {
            cliLogger.info(`Active migration: ${summary}`);
        }

        // Show counts
        await showDatabaseCountsForModel(mapping);
    }
}

async function showMigrationOverview() {
    const activeMigrations =
        await MigrationProgressTracker.listActiveMigrations();

    if (activeMigrations.length > 0) {
        cliLogger.info(`Found ${activeMigrations.length} active migration(s):`);

        for (const migrationModel of activeMigrations) {
            const canResume = await MigrationProgressTracker.canResume(
                migrationModel
            );
            const status = canResume ? "RESUMABLE" : "COMPLETE";
            cliLogger.info(`  - ${migrationModel}: ${status}`);
        }

        cliLogger.info(
            "\nUse --model <name> to see detailed progress for a specific model"
        );
    }

    // Always show quick overview of all models
    cliLogger.info("\n=== Migration Overview (MongoDB → PostgreSQL) ===");

    const results = [];
    for (const mapping of MODEL_MAPPINGS) {
        try {
            const result = await getQuickCounts(mapping);
            results.push(result);
        } catch (error) {
            results.push({
                name: mapping.displayName,
                status: `Error: ${error}`,
                mongo: 0,
                postgres: 0,
                progress: "0%",
            });
        }
    }

    // Display results in a table format
    cliLogger.info(
        `${"Model".padEnd(20)} | ${"Status".padEnd(12)} | ${"MongoDB".padEnd(
            12
        )} | ${"PostgreSQL".padEnd(12)} | Progress`
    );
    cliLogger.info("-".repeat(80));

    for (const result of results) {
        const mongoStr =
            result.mongo >= 1000000
                ? `${(result.mongo / 1000000).toFixed(1)}M`
                : result.mongo >= 1000
                ? `${(result.mongo / 1000).toFixed(1)}K`
                : result.mongo.toString();

        const postgresStr =
            result.postgres >= 1000000
                ? `${(result.postgres / 1000000).toFixed(1)}M`
                : result.postgres >= 1000
                ? `${(result.postgres / 1000).toFixed(1)}K`
                : result.postgres.toString();

        cliLogger.info(
            `${result.name.padEnd(20)} | ${result.status.padEnd(
                12
            )} | ${mongoStr.padEnd(12)} | ${postgresStr.padEnd(12)} | ${
                result.progress
            }`
        );
    }

    cliLogger.info("\nUse --all flag to see detailed counts for all models");
    cliLogger.info("Use --model <name> for specific model details");
}

async function getQuickCounts(mapping: ModelMapping) {
    let mongoCount = 0;
    let postgresCount = 0;
    let status = "Unknown";

    try {
        // Get MongoDB count with timeout to avoid session issues
        mongoCount = await getMongoCount(mapping.mongoModel);

        // Get PostgreSQL count
        postgresCount = await getPrismaCount(mapping.prismaTable);

        // Determine status
        if (postgresCount === 0) {
            status = "Not Started";
        } else if (mongoCount > 0 && postgresCount >= mongoCount * 0.95) {
            status = "Complete";
        } else if (mongoCount > 0) {
            status = "In Progress";
        } else {
            status = "Complete";
        }
    } catch (error) {
        status = "Error";
    }

    const progress =
        mongoCount > 0
            ? `${Math.min(100, (postgresCount / mongoCount) * 100).toFixed(1)}%`
            : "100%";

    return {
        name: mapping.displayName,
        status,
        mongo: mongoCount,
        postgres: postgresCount,
        progress,
    };
}

async function resolveWithTimeout<T>(
    promise: Promise<T>,
    timeoutMs: number,
    timeoutMessage: string
): Promise<T> {
    let timeoutId: ReturnType<typeof setTimeout> | undefined;

    try {
        const timeoutPromise = new Promise<never>((_, reject) => {
            timeoutId = setTimeout(
                () => reject(new Error(timeoutMessage)),
                timeoutMs
            );
        });

        return await Promise.race([promise, timeoutPromise]);
    } finally {
        if (timeoutId) {
            clearTimeout(timeoutId);
        }
    }
}

async function getMongoCount(mongoModel: any): Promise<number> {
    try {
        // Use estimatedDocumentCount for better performance, with timeout
        return await resolveWithTimeout(
            mongoModel.estimatedDocumentCount(),
            MONGO_COUNT_TIMEOUT_MS,
            "MongoDB count timeout"
        );
    } catch (error) {
        cliLogger.warn(`Failed to get MongoDB count: ${error}`);
        return 0;
    }
}

async function getPrismaCount(tableName: string): Promise<number> {
    try {
        // Dynamic access to Prisma models
        const model = (prisma as any)[tableName];
        if (!model) {
            throw new Error(`Unknown Prisma model: ${tableName}`);
        }
        return await model.count();
    } catch (error) {
        cliLogger.warn(
            `Failed to get PostgreSQL count for ${tableName}: ${error}`
        );
        return 0;
    }
}

async function showDatabaseCountsForModel(mapping: ModelMapping) {
    try {
        cliLogger.info(`\n=== ${mapping.displayName} Database Counts ===`);

        // Get counts
        const mongoCount = await getMongoCount(mapping.mongoModel);
        const postgresCount = await getPrismaCount(mapping.prismaTable);

        // Display counts
        const mongoStr =
            mongoCount >= 1000000
                ? `${(mongoCount / 1000000).toFixed(2)}M`
                : mongoCount >= 1000
                ? `${(mongoCount / 1000).toFixed(1)}K`
                : mongoCount.toString();

        const postgresStr =
            postgresCount >= 1000000
                ? `${(postgresCount / 1000000).toFixed(2)}M`
                : postgresCount >= 1000
                ? `${(postgresCount / 1000).toFixed(1)}K`
                : postgresCount.toString();

        cliLogger.info(
            `MongoDB ${
                mapping.displayName
            }: ${mongoStr} (${mongoCount.toLocaleString()})`
        );
        cliLogger.info(
            `PostgreSQL ${
                mapping.displayName
            }: ${postgresStr} (${postgresCount.toLocaleString()})`
        );

        if (mongoCount > 0) {
            const progress = Math.min(100, (postgresCount / mongoCount) * 100);
            cliLogger.info(`Migration Progress: ${progress.toFixed(2)}%`);

            if (progress < 95) {
                cliLogger.warn(
                    `⚠️  Migration may be incomplete or in progress`
                );
            } else if (progress >= 100) {
                cliLogger.info(`✅ Migration appears complete`);
            }
        } else if (postgresCount > 0) {
            cliLogger.info(`✅ Data exists in PostgreSQL (MongoDB empty)`);
        } else {
            cliLogger.warn(`⚠️  No data found in either database`);
        }

        // Show sample records if available
        const model = (prisma as any)[mapping.prismaTable];
        if (model && postgresCount > 0) {
            try {
                const sample = await model.findMany({
                    take: 3,
                    orderBy: { id: "desc" },
                });
                if (sample.length > 0) {
                    cliLogger.info(`Latest records in PostgreSQL:`);
                    sample.forEach((record: any) => {
                        const identifier =
                            record.id ||
                            record.character_id ||
                            record.alliance_id ||
                            record.corporation_id ||
                            "N/A";
                        cliLogger.info(`  - ID: ${identifier}`);
                    });
                }
            } catch (error) {
                // Ignore sample errors - not critical
            }
        }
    } catch (error) {
        cliLogger.error(
            `Error checking ${mapping.displayName} counts: ${error}`
        );
    }
}

async function showDatabaseCounts(modelName: string) {
    const mapping = MODEL_MAPPINGS.find(
        (m) => m.name.toLowerCase() === modelName.toLowerCase()
    );
    if (mapping) {
        await showDatabaseCountsForModel(mapping);
    } else {
        cliLogger.error(`Unknown model: ${modelName}`);
    }
}

async function clearMigrationProgress(options: { model: string }) {
    const { model } = options;

    cliLogger.info(`Clearing migration progress for ${model}...`);
    await MigrationProgressTracker.clearProgress(model);
    cliLogger.info(
        `Progress cleared for ${model}. Migration can now be restarted from the beginning.`
    );
}

export default {
    name: "checkMigrationStatus",
    description:
        "Check migration progress and status with comprehensive overview",
    longRunning: false,
    options: [
        {
            flags: "--model <model>",
            description: "Check progress for specific model",
        },
        {
            flags: "--all",
            description: "Show detailed counts for all models",
        },
        {
            flags: "--clear <model>",
            description: "Clear progress for specific model (allows restart)",
        },
    ],
    run: async (args: string[] = [], options: any = {}) => {
        try {
            if (options.clear) {
                await clearMigrationProgress({ model: options.clear });
            } else {
                await checkMigrationStatus({
                    model: options.model,
                    all: options.all,
                });
            }
        } catch (error) {
            cliLogger.error(`Migration status check failed: ${error}`);
            process.exit(1);
        }
    },
};
