import chalk from "chalk";
import { Meilisearch } from "~/server/helpers/Meilisearch";
import type { IAlliance } from "~/server/interfaces/IAlliance";
import type { ICharacter } from "~/server/interfaces/ICharacter";
import type { ICorporation } from "~/server/interfaces/ICorporation";
import type { IFaction } from "~/server/interfaces/IFaction";
import type { ISolarSystem } from "~/server/interfaces/ISolarSystem";
import { Alliances } from "~/server/models/Alliances";
import { Characters } from "~/server/models/Characters";
import { Corporations } from "~/server/models/Corporations";
import { Factions } from "~/server/models/Factions";
import { InvTypes } from "~/server/models/InvTypes";
import { Regions } from "~/server/models/Regions";
import { SolarSystems } from "~/server/models/SolarSystems";

const BATCH_SIZE = 1000000;

type EntityTypes =
    | "characters"
    | "corporations"
    | "alliances"
    | "factions"
    | "systems"
    | "regions"
    | "items";

/**
 * Get estimated document count for a given model
 *
 * @param model - Mongoose model to get count from
 * @param filter - Optional filter to apply
 * @returns Estimated document count
 */
async function getEstimatedCount(model: any, filter: any = {}): Promise<number> {
    try {
        // Using estimatedDocumentCount for better performance
        return await model.estimatedDocumentCount(filter);
    } catch (error) {
        console.error(`Error getting count: ${error}`);
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
function formatProgressBar(current: number, total: number, barLength = 20): string {
    const percentage = Math.min(Math.round((current / total) * 100), 100);
    const filledLength = Math.round((barLength * current) / total);

    const bar = "█".repeat(filledLength) + "░".repeat(Math.max(0, barLength - filledLength));
    return `${bar} ${percentage}% (${current}/${total})`;
}

export default {
    name: "update:meilisearch",
    description: "Update the search index in Meilisearch",
    longRunning: false,
    run: async () => {
        console.log(chalk.blue("Starting Meilisearch update process..."));
        const meilisearch = new Meilisearch();

        // Drop the placeholder index if it exists
        const indexExists = await meilisearch.existsIndex("nitro-update");
        if (indexExists) {
            await meilisearch.deleteIndex("nitro-update");
            console.log(chalk.yellow("Deleted existing nitro-update index"));
        }

        // Create a placeholder index
        await meilisearch.createIndex("nitro-update", { 'primaryKey': 'id' });
        console.log(chalk.green("Created nitro-update index"));

        // Ensure the nitro index exists
        const nitroIndexExists = await meilisearch.existsIndex("nitro");
        if (!nitroIndexExists) {
            console.log(chalk.yellow("Creating nitro index..."));
            await meilisearch.createIndex("nitro", { 'primaryKey': 'id' });
        }

        // Set ranking rules to prioritize based on rank field, then default rules
        await meilisearch.updateRankingRules("nitro-update", [
            "rank:asc", // Lower rank values appear first (items=1, characters=7)
            "words",
            "typo",
            "proximity",
            "attribute",
            "sort",
            "exactness",
        ]);
        console.log(chalk.green("Updated ranking rules"));

        // Configure filterable attributes to enable language filtering
        await meilisearch.updateFilterableAttributes("nitro-update", [
            "type",
            "rank",
            "lang",
            "originalId",
        ]);
        console.log(chalk.green("Updated filterable attributes"));

        const entityTypes: EntityTypes[] = [
            "items",
            "regions",
            "systems",
            "factions",
            "alliances",
            "corporations",
            "characters",
        ];

        // Get estimated counts for each entity type
        console.log(chalk.blue("Calculating estimated document counts..."));
        const estimatedCounts: Record<EntityTypes, number> = {
            characters: await getEstimatedCount(Characters, { deleted: false }),
            corporations: await getEstimatedCount(Corporations),
            alliances: await getEstimatedCount(Alliances),
            factions: await getEstimatedCount(Factions),
            systems: await getEstimatedCount(SolarSystems),
            regions: await getEstimatedCount(Regions),
            items: await getEstimatedCount(InvTypes, { published: true }),
        };

        console.log(chalk.blue("Estimated entity counts:"));
        for (const [type, count] of Object.entries(estimatedCounts)) {
            console.log(`  - ${chalk.cyan(type)}: ${chalk.yellow(count.toLocaleString())}`);
        }

        const resultCount: Record<EntityTypes, number> = {
            characters: 0,
            corporations: 0,
            alliances: 0,
            factions: 0,
            systems: 0,
            regions: 0,
            items: 0,
        };

        // Track overall progress
        const totalEstimated = Object.values(estimatedCounts).reduce((sum, curr) => sum + curr, 0);
        let totalProcessed = 0;
        const startTime = Date.now();

        console.log(chalk.blue("Starting entity processing..."));
        for (const entityType of entityTypes) {
            console.log(`\n${chalk.cyan("Processing")} ${chalk.yellow(entityType)}...`);
            resultCount[entityType] = await processEntities(
                entityType,
                meilisearch,
                estimatedCounts[entityType],
            );

            totalProcessed += resultCount[entityType];

            // Show progress after each entity type
            const overallPercentage = Math.round((totalProcessed / totalEstimated) * 100);
            console.log(
                `${chalk.green("Overall progress")}: ${overallPercentage}% (${totalProcessed.toLocaleString()}/${totalEstimated.toLocaleString()})`,
            );
        }

        // Replace the nitro index with nitro-update
        console.log(chalk.blue("Replacing nitro index with nitro-update..."));
        await meilisearch.replaceIndex("nitro", "nitro-update");
        await meilisearch.deleteIndex("nitro-update");

        const duration = (Date.now() - startTime) / 1000;
        console.log(chalk.green(`\nMeilisearch update completed in ${duration.toFixed(2)} seconds`));
        console.log(chalk.blue("Entities processed:"));

        for (const [type, count] of Object.entries(resultCount)) {
            console.log(`  - ${chalk.cyan(type)}: ${chalk.yellow(count.toLocaleString())}`);
        }

        return { result: resultCount };
    },
};

/**
 * Process entities of a specific type and add them to Meilisearch
 *
 * @param entityType - Type of entity to process
 * @param meilisearch - Meilisearch instance
 * @param estimatedTotal - Estimated total documents for this entity type
 * @returns Number of processed entities
 */
async function processEntities(
    entityType: EntityTypes,
    meilisearch: Meilisearch,
    estimatedTotal: number,
): Promise<number> {
    let count = 0;
    let skip = 0;
    let hasMore = true;
    let lastLoggedPercentage = -1;

    // Show initial progress bar
    process.stdout.write(`  ${formatProgressBar(count, estimatedTotal)}\r`);

    while (hasMore) {
        const entities = await getEntities(entityType, skip, BATCH_SIZE);
        if (entities.length > 0) {
            let res = await meilisearch.addDocuments("nitro-update", entities);
            const taskUid = res.taskUid;
            // Get the task status
            let taskStatus = await meilisearch.getTaskStatus(taskUid);
            // wait until the task is no longer in processing
            while (taskStatus.status !== "succeeded") {
                await new Promise((resolve) => setTimeout(resolve, 1000));
                taskStatus = await meilisearch.getTaskStatus(taskUid);
                if (taskStatus.status === "failed") {
                    console.error(`Task failed: ${taskStatus.error.message}`);
                    break;
                }
            }

            count += entities.length;
            skip += BATCH_SIZE;

            // Calculate current percentage and update progress bar
            const currentPercentage = Math.round((count / estimatedTotal) * 100);

            // Only update when percentage changes or it's the final update
            if (currentPercentage !== lastLoggedPercentage) {
                process.stdout.write(`  ${formatProgressBar(count, estimatedTotal)}\r`);
                lastLoggedPercentage = currentPercentage;
            }
        }

        hasMore = entities.length === BATCH_SIZE;
    }

    // Ensure final update with a newline
    process.stdout.write(`  ${formatProgressBar(count, estimatedTotal)}\n`);
    return count;
}

async function getEntities(entityType: EntityTypes, skip: number, limit: number) {
    switch (entityType) {
        case "characters": {
            const characters = await Characters.find(
                { deleted: false, "character_id": { $exists: true } },
                {
                    character_id: 1,
                    name: 1,
                },
            )
                .skip(skip)
                .limit(limit);
            return characters.map((character: ICharacter) => ({
                id: character.character_id,
                name: character.name,
                type: "character",
                rank: 7,
                lang: "all", // Add this field for searchability
            }));
        }

        case "corporations": {
            const corporations = await Corporations.find(
                { "corporation_id": { $exists: true } },
                {
                    corporation_id: 1,
                    name: 1,
                    ticker: 1,
                },
            )
                .skip(skip)
                .limit(limit);
            return corporations.map((corporation: ICorporation) => ({
                id: corporation.corporation_id,
                name: corporation.name,
                ticker: corporation.ticker,
                type: "corporation",
                rank: 6,
                lang: "all", // Add this field for searchability
            }));
        }
        case "alliances": {
            const alliances = await Alliances.find(
                { "alliance_id": { $exists: true } },
                {
                    alliance_id: 1,
                    name: 1,
                    ticker: 1,
                },
            )
                .skip(skip)
                .limit(limit);
            return alliances.map((alliance: IAlliance) => ({
                id: alliance.alliance_id,
                name: alliance.name,
                ticker: alliance.ticker,
                type: "alliance",
                rank: 5,
                lang: "all", // Add this field for searchability
            }));
        }

        case "factions": {
            const factions = await Factions.find(
                { "faction_id": { $exists: true } },
                {
                    faction_id: 1,
                    name: 1,
                },
            )
                .skip(skip)
                .limit(limit);
            return factions.map((faction: IFaction) => ({
                id: faction.faction_id,
                name: faction.name,
                type: "faction",
                rank: 4,
                lang: "all", // Add this field for searchability
            }));
        }
        case "systems": {
            const systems = await SolarSystems.find(
                { "system_id": { $exists: true } },
                {
                    system_id: 1,
                    system_name: 1,
                },
            )
                .skip(skip)
                .limit(limit);
            return systems.map((system: ISolarSystem) => ({
                id: system.system_id,
                name: system.system_name,
                type: "system",
                rank: 3,
                lang: "all", // Add this field for searchability
            }));
        }

        case "regions": {
            const regions = await Regions.find(
                { "region_id": { $exists: true } },
                {
                    region_id: 1,
                    name: 1,
                },
            )
                .skip(skip)
                .limit(limit);

            // Create separate searchable documents for each available language
            const translatedRegions = [];
            for (const region of regions) {
                // Get the keys inside of region.name
                const languages = Object.keys(region.name);

                for (const lang of languages) {
                    translatedRegions.push({
                        id: `${region.region_id}_${lang}`,
                        originalId: region.region_id,
                        name: region.name[lang] || region.name.en,
                        type: "region",
                        rank: 2,
                        lang: lang,
                    });
                }
            }

            return translatedRegions;
        }

        case "items": {
            const items = await InvTypes.find(
                { published: true },
                {
                    type_id: 1,
                    name: 1,
                },
            )
                .skip(skip)
                .limit(limit);

            // Create separate searchable documents for each available language
            const translatedItems = [];
            for (const item of items) {
                const languages = Object.keys(item.name);

                for (const lang of languages) {
                    translatedItems.push({
                        id: `${item.type_id}_${lang}`,
                        originalId: item.type_id,
                        name: item.name[lang] || item.name.en,
                        type: "item",
                        rank: 1,
                        lang,
                    });
                }
            }

            return translatedItems;
        }

        default: {
            return [];
        }
    }
}
