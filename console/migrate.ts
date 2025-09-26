import { cliLogger } from "../server/helpers/Logger";
import { MigrationProgressTracker } from "./migration/MigrationProgressTracker";

// Define migration order - smallest to largest datasets, with dependencies considered
const MIGRATION_ORDER = [
    // Small reference data first
    {
        name: "config",
        estimatedRecords: 25,
        priority: 1,
        description: "System configuration",
    },
    {
        name: "apikeys",
        estimatedRecords: 8000,
        priority: 1,
        description: "API keys",
    },
    {
        name: "users",
        estimatedRecords: 12000,
        priority: 1,
        description: "User accounts",
    },

    // Core entities (medium size)
    {
        name: "alliances",
        estimatedRecords: 17657,
        priority: 2,
        description: "Alliance data",
        dependencies: [],
    },
    {
        name: "corporations",
        estimatedRecords: 966000,
        priority: 3,
        description: "Corporation data",
        dependencies: ["alliances"],
    },
    {
        name: "characters",
        estimatedRecords: 20600000,
        priority: 4,
        description: "Character data",
        dependencies: ["corporations", "alliances"],
    },

    // Game data and statistics
    {
        name: "campaigns",
        estimatedRecords: 2000,
        priority: 2,
        description: "War campaigns",
    },
    {
        name: "wars",
        estimatedRecords: 15000,
        priority: 3,
        description: "War declarations",
    },
    {
        name: "stats",
        estimatedRecords: 50000,
        priority: 3,
        description: "Statistical data",
    },
    {
        name: "characterachievements",
        estimatedRecords: 85000,
        priority: 3,
        description: "Character achievements",
    },
    {
        name: "customprices",
        estimatedRecords: 15000,
        priority: 3,
        description: "Custom pricing data",
    },

    // Medium datasets
    {
        name: "comments",
        estimatedRecords: 75000,
        priority: 4,
        description: "Killmail comments",
    },
    {
        name: "dscan", // Broken
        estimatedRecords: 125000,
        priority: 4,
        description: "D-scan data",
    },
    {
        name: "battles",
        estimatedRecords: 495000,
        priority: 4,
        description: "Battle reports",
        dependencies: ["characters", "corporations", "alliances"],
    },
    {
        name: "sovereignty",
        estimatedRecords: 8000,
        priority: 3,
        description: "Sovereignty data",
    },

    // Large datasets
    {
        name: "prices",
        estimatedRecords: 250000000,
        priority: 5,
        description: "Market price history",
    },

    // Massive datasets - save for last
    {
        name: "killmails",
        estimatedRecords: 80000000,
        priority: 6,
        description: "Killmail data",
        dependencies: ["characters", "corporations", "alliances", "battles"],
    },
    {
        name: "killmailsesi",
        estimatedRecords: 80000000,
        priority: 6,
        description: "ESI processing data",
        dependencies: ["killmails"],
    },
];

interface MigrationItem {
    name: string;
    estimatedRecords: number;
    priority: number;
    description: string;
    dependencies?: string[];
}

// Import migration functions dynamically to avoid loader issues
async function getMigrationFunctions(model: string) {
    switch (model.toLowerCase()) {
        case "alliances":
            const { migrateAlliances } = await import(
                "./migration/migrateAlliances"
            );
            const { validateAlliances } = await import(
                "./migration/validateAlliances"
            );
            return { migrate: migrateAlliances, validate: validateAlliances };

        case "characters":
            const { migrateCharacters } = await import(
                "./migration/migrateCharacters"
            );
            const { validateCharacters } = await import(
                "./migration/validateCharacters"
            );
            return { migrate: migrateCharacters, validate: validateCharacters };

        case "corporations":
            const { migrateCorporations } = await import(
                "./migration/migrateCorporations"
            );
            const { validateCorporations } = await import(
                "./migration/validateCorporations"
            );
            return {
                migrate: migrateCorporations,
                validate: validateCorporations,
            };

        case "battles":
            const { migrateBattles } = await import(
                "./migration/migrateBattles"
            );
            const { validateBattles } = await import(
                "./migration/validateBattles"
            );
            return {
                migrate: migrateBattles,
                validate: validateBattles,
            };

        case "campaigns":
            const { migrateCampaigns } = await import(
                "./migration/migrateCampaigns"
            );
            const { validateCampaigns } = await import(
                "./migration/validateCampaigns"
            );
            return {
                migrate: migrateCampaigns,
                validate: validateCampaigns,
            };

        case "characterachievements":
            const { migrateCharacterAchievements } = await import(
                "./migration/migrateCharacterAchievements"
            );
            const { validateCharacterAchievements } = await import(
                "./migration/validateCharacterAchievements"
            );
            return {
                migrate: migrateCharacterAchievements,
                validate: validateCharacterAchievements,
            };

        case "stats":
            const { migrateStats } = await import("./migration/migrateStats");
            const { validateStats } = await import("./migration/validateStats");
            return { migrate: migrateStats, validate: validateStats };

        case "customprices":
            const { migrateCustomPrices } = await import(
                "./migration/migrateCustomPrices"
            );
            const { validateCustomPrices } = await import(
                "./migration/validateCustomPrices"
            );
            return {
                migrate: migrateCustomPrices,
                validate: validateCustomPrices,
            };

        case "prices":
            const { migratePrices } = await import("./migration/migratePrices");
            const { validatePrices } = await import(
                "./migration/validatePrices"
            );
            return { migrate: migratePrices, validate: validatePrices };

        case "killmails":
            const { migrateKillmails } = await import(
                "./migration/migrateKillmails"
            );
            const { validateKillmails } = await import(
                "./migration/validateKillmails"
            );
            return { migrate: migrateKillmails, validate: validateKillmails };

        case "comments":
            const { migrateComments } = await import(
                "./migration/migrateComments"
            );
            const { validateComments } = await import(
                "./migration/validateComments"
            );
            return { migrate: migrateComments, validate: validateComments };

        case "wars":
            const { migrateWars } = await import("./migration/migrateWars");
            const { validateWars } = await import("./migration/validateWars");
            return { migrate: migrateWars, validate: validateWars };

        case "users":
            const { migrateUsers } = await import("./migration/migrateUsers");
            const { validateUsers } = await import("./migration/validateUsers");
            return { migrate: migrateUsers, validate: validateUsers };

        case "apikeys":
            const { migrateApiKeys } = await import(
                "./migration/migrateApiKeys"
            );
            // TODO: Add validateApiKeys when created
            return { migrate: migrateApiKeys, validate: null };

        case "config":
            const { migrateConfig } = await import("./migration/migrateConfig");
            // TODO: Add validateConfig when created
            return { migrate: migrateConfig, validate: null };

        case "dscan":
            const { migrateDScan } = await import("./migration/migrateDScan");
            // TODO: Add validateDScan when created
            return { migrate: migrateDScan, validate: null };

        case "sovereignty":
            const { migrateSovereignty } = await import(
                "./migration/migrateSovereignty"
            );
            // TODO: Add validateSovereignty when created
            return { migrate: migrateSovereignty, validate: null };

        default:
            throw new Error(`Unknown model: ${model}`);
    }
}

interface MigrationOptions {
    model: string;
    validate: boolean;
    force: boolean;
    resume: boolean;
    restart: boolean;
    all: boolean;
    skipCompleted: boolean;
}

async function runAllMigrations(options: MigrationOptions) {
    const { validate, force, resume, restart, skipCompleted } = options;

    cliLogger.info("=== COMPREHENSIVE MIGRATION ORCHESTRATOR ===");
    cliLogger.info("Running all migrations in optimal order...");
    cliLogger.info(
        `Validation: ${validate}, Force: ${force}, Resume: ${resume}, Restart: ${restart}`
    );
    cliLogger.info(`Skip completed: ${skipCompleted}`);

    // Sort migrations by priority, then by estimated records
    const sortedMigrations = [...MIGRATION_ORDER].sort((a, b) => {
        if (a.priority !== b.priority) {
            return a.priority - b.priority;
        }
        return a.estimatedRecords - b.estimatedRecords;
    });

    cliLogger.info("\n=== MIGRATION EXECUTION PLAN ===");
    sortedMigrations.forEach((migration, index) => {
        const sizeLabel =
            migration.estimatedRecords > 1000000
                ? `${(migration.estimatedRecords / 1000000).toFixed(1)}M`
                : migration.estimatedRecords > 1000
                ? `${(migration.estimatedRecords / 1000).toFixed(0)}K`
                : migration.estimatedRecords.toString();

        cliLogger.info(
            `${index + 1}. ${migration.name.toUpperCase()} - ${
                migration.description
            } (${sizeLabel} records)`
        );
    });

    let completedMigrations = 0;
    let skippedMigrations = 0;
    let failedMigrations = 0;
    const startTime = Date.now();

    cliLogger.info("\n=== STARTING MIGRATIONS ===");

    for (const migration of sortedMigrations) {
        try {
            cliLogger.info(
                `\n--- Starting ${migration.name.toUpperCase()} Migration ---`
            );
            cliLogger.info(`Description: ${migration.description}`);
            cliLogger.info(
                `Estimated records: ${migration.estimatedRecords.toLocaleString()}`
            );

            // Check dependencies
            if (migration.dependencies && migration.dependencies.length > 0) {
                cliLogger.info(
                    `Dependencies: ${migration.dependencies.join(", ")}`
                );
                // In a full implementation, we'd verify dependencies are complete
            }

            // Check if already completed and skip if requested
            if (skipCompleted) {
                let isAlreadyCompleted = false;

                // First check if there's no resumable progress (meaning it's complete or never started)
                const canResume = await MigrationProgressTracker.canResume(
                    migration.name
                );
                if (!canResume) {
                    // Check if migration has data (basic completion check)
                    try {
                        const { validate: validateFunction } =
                            await getMigrationFunctions(migration.name);
                        if (validateFunction) {
                            const validation = await validateFunction();
                            if (validation && validation.postgresCount > 0) {
                                cliLogger.info(
                                    `✅ ${
                                        migration.name
                                    } already completed (${validation.postgresCount.toLocaleString()} records found)`
                                );
                                isAlreadyCompleted = true;
                            }
                        }
                    } catch (error) {
                        cliLogger.debug(
                            `Could not check completion status for ${migration.name}: ${error}`
                        );
                    }
                }

                if (isAlreadyCompleted) {
                    skippedMigrations++;
                    continue;
                }
            }

            // Run the migration
            await migrate({
                model: migration.name,
                validate,
                force,
                resume,
                restart,
                all: false,
                skipCompleted: false,
            });

            completedMigrations++;
            cliLogger.info(
                `✅ ${migration.name.toUpperCase()} migration completed successfully`
            );
        } catch (error) {
            failedMigrations++;
            cliLogger.error(
                `❌ ${migration.name.toUpperCase()} migration failed: ${error}`
            );

            // Ask user whether to continue or stop
            cliLogger.error(
                `Migration ${migration.name} failed. Stopping execution.`
            );
            cliLogger.error(
                "Fix the issue and run with --resume to continue from where you left off."
            );
            break;
        }
    }

    const totalTime = Date.now() - startTime;
    const timeFormatted =
        totalTime > 3600000
            ? `${(totalTime / 3600000).toFixed(1)} hours`
            : totalTime > 60000
            ? `${(totalTime / 60000).toFixed(1)} minutes`
            : `${(totalTime / 1000).toFixed(1)} seconds`;

    cliLogger.info("\n=== MIGRATION SUMMARY ===");
    cliLogger.info(`Total time: ${timeFormatted}`);
    cliLogger.info(`Completed: ${completedMigrations}`);
    cliLogger.info(`Skipped: ${skippedMigrations}`);
    cliLogger.info(`Failed: ${failedMigrations}`);
    cliLogger.info(`Total planned: ${sortedMigrations.length}`);

    if (failedMigrations > 0) {
        cliLogger.error(
            "Some migrations failed. Check the logs and run with --resume to continue."
        );
        process.exit(1);
    } else if (
        completedMigrations + skippedMigrations ===
        sortedMigrations.length
    ) {
        cliLogger.info("🎉 All migrations completed successfully!");
    }
}

async function migrate(options: MigrationOptions) {
    const { model, validate, force, resume, restart, all } = options;

    // If --all flag is used or no specific model provided, run comprehensive migration orchestrator
    if (all || !model) {
        return await runAllMigrations(options);
    }

    cliLogger.info("=== Database Migration Tool ===");
    cliLogger.info(`Target model: ${model}`);
    cliLogger.info(`Validation enabled: ${validate}`);
    cliLogger.info(`Resume mode: ${resume}`);
    cliLogger.info(`Restart mode: ${restart}`);

    try {
        const { disableForeignKeyChecks, enableForeignKeyChecks } =
            await import("./migration/foreignKeys");

        // Handle restart flag - clear progress if requested
        if (restart) {
            cliLogger.info(`Clearing existing progress for ${model}...`);
            await MigrationProgressTracker.clearProgress(model);
        }

        // Check for existing progress
        const canResume = await MigrationProgressTracker.canResume(model);
        if (canResume && !restart) {
            if (resume) {
                cliLogger.info(`Resuming existing migration for ${model}...`);
            } else {
                cliLogger.warn(`Existing progress found for ${model}`);
                cliLogger.warn(
                    "Use --resume to continue or --restart to start over"
                );
                const summary =
                    await MigrationProgressTracker.getProgressSummary(model);
                if (summary) {
                    cliLogger.info(`\n${summary}`);
                }
                return;
            }
        }

        await disableForeignKeyChecks();

        cliLogger.info(`Starting ${model} migration...`);
        const { migrate: migrateFunction, validate: validateFunction } =
            await getMigrationFunctions(model);

        if (!force && !canResume && validateFunction && validate) {
            cliLogger.info("Pre-migration validation...");
            const preValidation = await validateFunction();

            if (preValidation && preValidation.postgresCount > 0) {
                cliLogger.warn(
                    `Found ${preValidation.postgresCount} existing records in PostgreSQL.`
                );
                cliLogger.warn(
                    "Use --force flag to proceed with migration anyway."
                );
                return;
            }
        } else if (!force && !validateFunction && validate) {
            cliLogger.info("Validation function not available for this model");
        }

        // Pass resume options to migration function
        const migrationOptions = {
            force,
            resume: canResume && resume,
            restart,
        };

        // For updated migration functions that support resumable operations
        if (model === "alliances") {
            // Cast to the specific alliance migration function type
            const allianceMigrationFn = migrateFunction as (options?: {
                force?: boolean;
                resume?: boolean;
                restart?: boolean;
            }) => Promise<any>;
            await allianceMigrationFn(migrationOptions);
        } else {
            // Fallback to old signature for migrations not yet updated
            cliLogger.warn(
                `${model} migration not yet updated for resumable operations. Using legacy mode.`
            );
            const legacyMigrationFn = migrateFunction as (
                force?: boolean
            ) => Promise<any>;
            await legacyMigrationFn(force);
        }

        if (validate && validateFunction) {
            cliLogger.info("Post-migration validation...");
            await validateFunction();
        } else if (validate && !validateFunction) {
            cliLogger.info(
                "Validation requested but validation function not available"
            );
        }

        await enableForeignKeyChecks();

        cliLogger.info(`${model} migration completed successfully!`);
    } catch (error) {
        cliLogger.error(`Migration failed: ${error}`);
        process.exit(1);
    }
}

export default {
    name: "migrate",
    description:
        "Migrate data from MongoDB to PostgreSQL. Run all migrations by default, or specify --model for individual migration.",
    longRunning: false,
    options: [
        {
            flags: "--model <model>",
            description:
                "Specific model to migrate. If not specified, runs all migrations in optimal order.",
        },
        {
            flags: "--no-validate",
            description: "Skip post-migration validation",
        },
        {
            flags: "--force",
            description: "Force migration even if target has existing data",
        },
        {
            flags: "--resume",
            description: "Resume migration from last checkpoint",
        },
        {
            flags: "--restart",
            description: "Clear progress and start migration from beginning",
        },
        {
            flags: "--all",
            description:
                "Run all migrations in optimal order (small to large datasets)",
        },
        {
            flags: "--skip-completed",
            description:
                "Skip migrations that already have data (use with --all)",
        },
    ],
    run: async (args: string[] = [], options: any = {}) => {
        const migrationOptions: MigrationOptions = {
            model: options.model || "",
            validate: !options.noValidate,
            force: options.force || false,
            resume: options.resume || false,
            restart: options.restart || false,
            all: options.all || !options.model, // Default to all migrations if no specific model
            skipCompleted: options.skipCompleted !== false, // Default to true for better UX
        };

        await migrate(migrationOptions);
    },
};
