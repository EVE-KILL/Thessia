import chalk from "chalk";
import { cliLogger } from "~/server/helpers/Logger"; // Using cliLogger for consistency if chalk is only for console specific styling
import {
    MeilisearchUpdater,
    type EntityType,
} from "~/server/helpers/MeilisearchUpdater";
import { Alliances } from "~/server/models/Alliances";
import { Characters } from "~/server/models/Characters";
import { Corporations } from "~/server/models/Corporations";
import { Factions } from "~/server/models/Factions";
import { InvTypes } from "~/server/models/InvTypes";
import { Regions } from "~/server/models/Regions";
import { SolarSystems } from "~/server/models/SolarSystems";

/**
 * Get estimated document count for a given model
 *
 * @param model - Mongoose model to get count from
 * @param filter - Optional filter to apply
 * @returns Estimated document count
 */
async function getEstimatedCount(
    model: any,
    filter: any = {}
): Promise<number> {
    try {
        // Using estimatedDocumentCount for better performance
        return await model.estimatedDocumentCount(filter);
    } catch (error: any) {
        cliLogger.error(
            `Error getting count for ${model.modelName}: ${error.message}`
        );
        return 0;
    }
}

/**
 * Format a progress bar string
 *
 * @param current - Current progress value
 * @param total - Total value for 100% progress
 * @param barLength - Length of the progress bar in characters
 * @returns Formatted progress bar string
 */
function formatProgressBar(
    current: number,
    total: number,
    entityType: EntityType,
    barLength = 20
): string {
    const percentage =
        total > 0 ? Math.min(Math.round((current / total) * 100), 100) : 100; // Handle total = 0 case
    const filledLength =
        total > 0 ? Math.round((barLength * current) / total) : barLength; // Handle total = 0 case

    const bar =
        "█".repeat(filledLength) +
        "░".repeat(Math.max(0, barLength - filledLength));
    // Return a string that the logger can handle, chalk styling will be applied by the caller if needed.
    return `  ${entityType}: ${bar} ${percentage}% (${current.toLocaleString()}/${total.toLocaleString()})`;
}

// Wrapper for chalk to be passed to the updater, or use cliLogger directly if chalk is not essential inside the updater
const consoleLogger = {
    info: (message: string) => console.log(chalk.blue(message)),
    success: (message: string) => console.log(chalk.green(message)),
    error: (message: string) => console.log(chalk.red(message)),
    warn: (message: string) => console.log(chalk.yellow(message)),
};

export default {
    name: "update:meilisearch",
    description:
        "Update the search index in Meilisearch using MeilisearchUpdater",
    longRunning: false,
    options: [
        {
            flags: "-u, --update <list>",
            description:
                "Comma-separated list of entities to update (characters,corporations,alliances,factions,systems,regions,items)",
            defaultValue: "all",
        },
        {
            flags: "-b, --batch-size <size>",
            description:
                "Number of documents to process per batch (default: 500)",
            defaultValue: "100000",
        },
    ],
    examples: [
        "bin/console update:meilisearch                                   # Update all entities",
        'bin/console update:meilisearch -u "items,regions,systems"        # Update only items, regions and systems',
        'bin/console update:meilisearch --update "characters,corporations" # Update only characters and corporations',
        "bin/console update:meilisearch -b 250                            # Use smaller batch size for large datasets",
    ],
    run: async (args: string[] = [], cmdOptions: any = {}) => {
        // Parse the update option
        const validEntities: EntityType[] = [
            "characters",
            "corporations",
            "alliances",
            "factions",
            "systems",
            "regions",
            "items",
        ];

        const batchSize = parseInt(cmdOptions.batchSize || "100000", 10);

        const entitiesToUpdate: EntityType[] = cmdOptions.update
            ? cmdOptions.update === "all"
                ? validEntities
                : (cmdOptions.update
                      .split(",")
                      .map((e: string) => e.trim().toLowerCase())
                      .filter((e: string) =>
                          validEntities.includes(e as EntityType)
                      ) as EntityType[])
            : validEntities;

        // Check for invalid entities and warn user
        if (cmdOptions.update && cmdOptions.update !== "all") {
            const requestedEntities = cmdOptions.update
                .split(",")
                .map((e: string) => e.trim().toLowerCase());
            const invalidEntities = requestedEntities.filter(
                (e: string) => !validEntities.includes(e as EntityType)
            );
            if (invalidEntities.length > 0) {
                console.log(
                    chalk.yellow(
                        `⚠️  Invalid entities ignored: ${invalidEntities.join(
                            ", "
                        )}`
                    )
                );
                console.log(
                    chalk.cyan(
                        `📋 Valid entities are: ${validEntities.join(", ")}`
                    )
                );
            }
        }

        console.log(
            chalk.blue(
                "Starting Meilisearch update process via MeilisearchUpdater..."
            )
        );

        if (entitiesToUpdate.length > 0) {
            console.log(
                chalk.cyan(
                    `📋 Updating entities: ${entitiesToUpdate.join(", ")}`
                )
            );
            console.log(chalk.cyan(`📦 Batch size: ${batchSize}`));
        } else {
            console.log(chalk.red("❌ No valid entities specified to update"));
            console.log(
                chalk.cyan(`📋 Valid entities are: ${validEntities.join(", ")}`)
            );
            return { error: "No valid entities specified" };
        }

        const startTime = Date.now();

        const updater = new MeilisearchUpdater({
            batchSize: batchSize,
            // logger: consoleLogger, // Using cliLogger by default in the helper now
            progressReporter: (processed, total, entityType) => {
                // Use process.stdout.write for dynamic progress bar in console
                const progressBarString = formatProgressBar(
                    processed,
                    total,
                    entityType
                );
                process.stdout.write(chalk.yellow(progressBarString) + "\r");
                if (processed === total) {
                    process.stdout.write("\n"); // New line when done for that entity type
                }
                return ""; // Return empty string as the progress is handled by stdout
            },
            getEstimatedCountsFn: async (
                entityType: EntityType
            ): Promise<number> => {
                // Only provide estimates for entities we're actually updating
                if (!entitiesToUpdate.includes(entityType)) {
                    return 0;
                }

                switch (entityType) {
                    case "characters":
                        return await getEstimatedCount(Characters, {
                            deleted: false,
                        });
                    case "corporations":
                        return await getEstimatedCount(Corporations);
                    case "alliances":
                        return await getEstimatedCount(Alliances);
                    case "factions":
                        return await getEstimatedCount(Factions);
                    case "systems":
                        return await getEstimatedCount(SolarSystems);
                    case "regions":
                        return await getEstimatedCount(Regions);
                    case "items":
                        return await getEstimatedCount(InvTypes, {
                            published: true,
                        });
                    default:
                        return 0;
                }
            },
        });

        try {
            // Use direct updates when selective entities are specified (not updating all)
            const isSelectiveUpdate =
                cmdOptions.update && cmdOptions.update !== "all";
            const resultCount = await updater.runUpdateForEntities(
                entitiesToUpdate,
                isSelectiveUpdate
            );
            const duration = (Date.now() - startTime) / 1000;
            console.log(
                chalk.green(
                    `\nMeilisearch update completed in ${duration.toFixed(
                        2
                    )} seconds`
                )
            );
            console.log(chalk.blue("Entities processed:"));

            for (const [type, count] of Object.entries(resultCount)) {
                console.log(
                    `  - ${chalk.cyan(type)}: ${chalk.yellow(
                        count.toLocaleString()
                    )}`
                );
            }
            return { result: resultCount };
        } catch (error: any) {
            console.error(
                chalk.red("Meilisearch update process failed:"),
                error.message
            );
            if (error.stack) {
                console.error(chalk.red(error.stack));
            }
            // Ensure process exits with error code if run as a script
            process.exitCode = 1;
            return { error: error.message };
        }
    },
};
