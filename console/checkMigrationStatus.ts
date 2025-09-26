import prisma from "../lib/prisma";
import { cliLogger } from "../server/helpers/Logger";
import { Characters } from "../server/models/Characters";
import { MigrationHelper } from "./migration/MigrationHelper";
import { MigrationProgressTracker } from "./migration/MigrationProgressTracker";

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
        // Check all active migrations
        await checkAllMigrations();
    } else {
        // Default: show overview of all migrations
        await showMigrationOverview();
    }
}

async function checkSpecificModel(modelName: string) {
    const summary = await MigrationProgressTracker.getProgressSummary(
        modelName
    );
    if (summary) {
        cliLogger.info(summary);

        // Also show database counts for verification
        await showDatabaseCounts(modelName);
    } else {
        cliLogger.info(`No active migration found for ${modelName}`);

        // Still show database counts
        await showDatabaseCounts(modelName);
    }
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

async function showMigrationOverview() {
    const activeMigrations =
        await MigrationProgressTracker.listActiveMigrations();

    if (activeMigrations.length === 0) {
        cliLogger.info("No active migrations found");
        cliLogger.info(
            "Use --all flag to check all models or --model <name> for specific model"
        );
    } else {
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
}

async function showDatabaseCounts(modelName: string) {
    try {
        switch (modelName.toLowerCase()) {
            case "characters":
                await showCharacterCounts();
                break;
            case "alliances":
                cliLogger.info("Alliance count check not yet implemented");
                break;
            case "corporations":
                cliLogger.info("Corporation count check not yet implemented");
                break;
            case "battles":
                cliLogger.info("Battle count check not yet implemented");
                break;
            // Add more cases as needed
            default:
                cliLogger.info(
                    `Database count check not implemented for ${modelName}`
                );
        }
    } catch (error) {
        cliLogger.warn(`Could not fetch database counts: ${error}`);
    }
}

async function showCharacterCounts() {
    try {
        // Count PostgreSQL characters (faster than MongoDB for large datasets)
        const postgresCount = await prisma.character.count();
        const postgresHistoryCount = await prisma.characterHistory.count();

        // Get a sample to see what's in the database
        const sampleChars = await prisma.character.findMany({
            take: 5,
            orderBy: { character_id: "desc" },
        });

        // Use estimated count for much faster results
        let mongoCount: number | null = null;
        let mongoCountStr = "Unknown";
        try {
            mongoCount = await MigrationHelper.getEstimatedCount(Characters);
            mongoCountStr = `~${mongoCount.toLocaleString()} (estimated)`;
        } catch (error) {
            cliLogger.warn(
                "MongoDB estimated count failed - dataset too large"
            );
        }

        cliLogger.info("\n=== Character Database Counts ===");
        cliLogger.info(`MongoDB Characters: ${mongoCountStr}`);
        cliLogger.info(
            `PostgreSQL Characters: ${postgresCount.toLocaleString()}`
        );
        cliLogger.info(
            `PostgreSQL History Records: ${postgresHistoryCount.toLocaleString()}`
        );

        if (mongoCount !== null) {
            const progress = ((postgresCount / mongoCount) * 100).toFixed(2);
            cliLogger.info(`Migration Progress: ${progress}%`);
        }

        if (sampleChars.length > 0) {
            cliLogger.info("Latest characters migrated:");
            sampleChars.forEach((char) => {
                cliLogger.info(
                    `  - ${char.character_id}: ${char.name || "No Name"}`
                );
            });
        } else {
            cliLogger.info("No characters found in PostgreSQL database");
        }
    } catch (error) {
        cliLogger.error(`Error checking character migration status: ${error}`);
        throw error;
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
    description: "Check migration progress and status with resumable tracking",
    longRunning: false,
    options: [
        {
            flags: "--model <model>",
            description: "Check progress for specific model",
        },
        {
            flags: "--all",
            description: "Show progress for all migrations",
        },
        {
            flags: "--clear <model>",
            description: "Clear progress for specific model (allows restart)",
        },
    ],
    run: async (args: string[] = [], options: any = {}) => {
        if (options.clear) {
            await clearMigrationProgress({ model: options.clear });
        } else {
            await checkMigrationStatus({
                model: options.model,
                all: options.all,
            });
        }
    },
};
