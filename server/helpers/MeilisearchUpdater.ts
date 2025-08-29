// Default batch size, can be overridden in options
const DEFAULT_BATCH_SIZE = 1000000;

export type EntityType =
    | "characters"
    | "corporations"
    | "alliances"
    | "factions"
    | "systems"
    | "regions"
    | "items";

export interface MeilisearchUpdaterOptions {
    progressReporter?:
        | ((processed: number, total: number, entityType: EntityType) => string)
        | null;
    getEstimatedCountsFn?: (entityType: EntityType) => Promise<number>;
    batchSize?: number;
}

export class MeilisearchUpdater {
    private readonly progressReporter:
        | ((processed: number, total: number, entityType: EntityType) => string)
        | null;
    private readonly getEstimatedCountsFn?: (
        entityType: EntityType
    ) => Promise<number>;
    private readonly client: Meilisearch;
    private readonly batchSize: number;

    constructor(options: MeilisearchUpdaterOptions = {}) {
        this.progressReporter =
            options.progressReporter === undefined
                ? null
                : options.progressReporter;
        this.getEstimatedCountsFn = options.getEstimatedCountsFn;
        this.client = new Meilisearch();
        this.batchSize = options.batchSize ?? DEFAULT_BATCH_SIZE;
    }

    private async getEntities(
        entityType: EntityType,
        skip: number,
        limit: number
    ): Promise<any[]> {
        switch (entityType) {
            case "characters": {
                const characters = await Characters.find(
                    { deleted: false, character_id: { $exists: true } },
                    {
                        character_id: 1,
                        name: 1,
                        deleted: 1,
                        last_active: 1,
                        updatedAt: 1,
                    }
                )
                    .skip(skip)
                    .limit(limit)
                    .lean();
                return characters.map((character: ICharacter) => ({
                    id: character.character_id,
                    name: character.name,
                    type: "character",
                    rank: 7,
                    lang: "all",
                    deleted: character.deleted || false,
                    last_active: character.last_active
                        ? character.last_active.toISOString()
                        : undefined,
                    updatedAt: character.updatedAt
                        ? character.updatedAt.toISOString()
                        : undefined,
                }));
            }
            case "corporations": {
                const corporations = await Corporations.find(
                    { corporation_id: { $exists: true } },
                    {
                        corporation_id: 1,
                        name: 1,
                        ticker: 1,
                        deleted: 1,
                        updatedAt: 1,
                    }
                )
                    .skip(skip)
                    .limit(limit)
                    .lean();
                return corporations.map((corporation: ICorporation) => ({
                    id: corporation.corporation_id,
                    name: corporation.name,
                    ticker: corporation.ticker,
                    type: "corporation",
                    rank: 6,
                    lang: "all",
                    deleted: corporation.deleted || false,
                    updatedAt: corporation.updatedAt
                        ? corporation.updatedAt.toISOString()
                        : undefined,
                }));
            }
            case "alliances": {
                const alliances = await Alliances.find(
                    { alliance_id: { $exists: true } },
                    {
                        alliance_id: 1,
                        name: 1,
                        ticker: 1,
                        deleted: 1,
                        updatedAt: 1,
                    }
                )
                    .skip(skip)
                    .limit(limit)
                    .lean();
                return alliances.map((alliance: IAlliance) => ({
                    id: alliance.alliance_id,
                    name: alliance.name,
                    ticker: alliance.ticker,
                    type: "alliance",
                    rank: 5,
                    lang: "all",
                    deleted: alliance.deleted || false,
                    updatedAt: alliance.updatedAt
                        ? alliance.updatedAt.toISOString()
                        : undefined,
                }));
            }
            case "factions": {
                const factions = await Factions.find(
                    { faction_id: { $exists: true } },
                    { faction_id: 1, name: 1 }
                )
                    .skip(skip)
                    .limit(limit)
                    .lean();
                return factions.map((faction: IFaction) => ({
                    id: faction.faction_id,
                    name: faction.name,
                    type: "faction",
                    rank: 4,
                    lang: "all",
                }));
            }
            case "systems": {
                const systems = await SolarSystems.find(
                    { system_id: { $exists: true } },
                    { system_id: 1, system_name: 1 }
                )
                    .skip(skip)
                    .limit(limit)
                    .lean();
                return systems.map((system: ISolarSystem) => ({
                    id: system.system_id,
                    name: system.system_name,
                    type: "system",
                    rank: 3,
                    lang: "all",
                }));
            }
            case "regions": {
                const regions = (await Regions.find(
                    { region_id: { $exists: true } },
                    { region_id: 1, name: 1 }
                )
                    .skip(skip)
                    .limit(limit)
                    .lean()) as IRegion[];

                const translatedRegions = [];
                for (const region of regions) {
                    if (region.name && typeof region.name === "object") {
                        const languages = Object.keys(region.name);
                        for (const lang of languages) {
                            translatedRegions.push({
                                id: `${region.region_id}_${lang}`,
                                originalId: region.region_id,
                                name:
                                    (region.name as any)[lang] ||
                                    (region.name as any).en,
                                type: "region",
                                rank: 2,
                                lang,
                            });
                        }
                    }
                }
                return translatedRegions;
            }
            case "items": {
                const items = (await InvTypes.find(
                    { published: true, type_id: { $exists: true } }, // Ensure type_id exists
                    { type_id: 1, name: 1 }
                )
                    .skip(skip)
                    .limit(limit)
                    .lean()) as IInvType[];

                const translatedItems = [];
                for (const item of items) {
                    if (item.name && typeof item.name === "object") {
                        const languages = Object.keys(item.name);
                        for (const lang of languages) {
                            translatedItems.push({
                                id: `${item.type_id}_${lang}`,
                                originalId: item.type_id,
                                name:
                                    (item.name as any)[lang] ||
                                    (item.name as any).en,
                                type: "item",
                                rank: 1,
                                lang,
                            });
                        }
                    }
                }
                return translatedItems;
            }
            default:
                cliLogger.warn(`Unknown entity type: ${entityType as string}`);
                return [];
        }
    }

    private async processEntities(
        entityType: EntityType,
        estimatedTotal: number,
        targetIndexName: string
    ): Promise<number> {
        let count = 0;
        let skip = 0;
        let hasMore = true;
        let lastLoggedPercentage = -1;

        if (this.progressReporter && estimatedTotal > 0) {
            cliLogger.info(
                this.progressReporter(count, estimatedTotal, entityType)
            );
        }

        while (hasMore) {
            const entities = await this.getEntities(
                entityType,
                skip,
                this.batchSize
            );
            if (entities.length > 0) {
                const res = await this.client.addDocuments(
                    targetIndexName,
                    entities
                );
                const taskUid = res.taskUid;
                let taskStatus = await this.client.getTaskStatus(taskUid);
                while (
                    taskStatus.status !== "succeeded" &&
                    taskStatus.status !== "failed"
                ) {
                    await new Promise((resolve) => setTimeout(resolve, 1000));
                    taskStatus = await this.client.getTaskStatus(taskUid);
                }

                if (taskStatus.status === "failed") {
                    cliLogger.error(
                        `Meilisearch task ${taskUid} failed for ${entityType}: ${
                            taskStatus.error?.message ?? "Unknown error"
                        }`
                    );
                    // Optionally, decide if you want to stop or continue for other batches/entities
                }

                count += entities.length;
                skip += this.batchSize; // Correctly increment skip by batchSize, not entities.length

                if (this.progressReporter && estimatedTotal > 0) {
                    const currentPercentage = Math.round(
                        (count / estimatedTotal) * 100
                    );
                    if (
                        currentPercentage !== lastLoggedPercentage ||
                        count === estimatedTotal
                    ) {
                        cliLogger.info(
                            this.progressReporter(
                                count,
                                estimatedTotal,
                                entityType
                            )
                        );
                        lastLoggedPercentage = currentPercentage;
                    }
                } else if (!this.progressReporter) {
                    cliLogger.info(
                        `Processed ${count} ${entityType}... (total for this batch type so far)`
                    );
                }
            }
            hasMore = entities.length === this.batchSize;
        }

        if (
            this.progressReporter &&
            estimatedTotal > 0 &&
            count !== estimatedTotal
        ) {
            // Ensure final progress update if not perfectly aligned
            cliLogger.info(
                this.progressReporter(count, estimatedTotal, entityType)
            );
        }
        cliLogger.info(`Finished processing ${count} ${entityType}.`); // Changed from success to info
        return count;
    }

    private async configureIndexSettings(indexName: string): Promise<void> {
        cliLogger.info(`Configuring settings for ${indexName}...`);
        await this.client.updateRankingRules(indexName, [
            "rank:asc",
            "words",
            "typo",
            "proximity",
            "attribute",
            "sort",
            "exactness",
        ]);
        await this.client.updateFilterableAttributes(indexName, [
            "type",
            "rank",
            "lang",
            "originalId",
            "deleted",
            "last_active",
            "updatedAt",
        ]);
        cliLogger.info(`Settings configured for ${indexName}.`);
    }

    public async runUpdate(): Promise<Record<EntityType, number>> {
        const entityTypes: EntityType[] = [
            "items",
            "regions",
            "systems",
            "factions",
            "alliances",
            "corporations",
            "characters",
        ];
        return this.runUpdateForEntities(entityTypes);
    }

    public async runUpdateForEntities(
        entityTypes: EntityType[],
        directUpdate: boolean = false
    ): Promise<Record<EntityType, number>> {
        const mainIndexName = "nitro";
        const updateIndexName = "nitro-update";
        const targetIndexName = directUpdate ? mainIndexName : updateIndexName;
        const processedCounts: Record<EntityType, number> = {} as Record<
            EntityType,
            number
        >;

        cliLogger.info(
            `Starting Meilisearch ${
                directUpdate ? "direct" : "full"
            } update process...`
        );

        try {
            if (directUpdate) {
                // For direct updates, ensure the main index exists
                const mainIndexExists = await this.client.existsIndex(
                    mainIndexName
                );
                if (!mainIndexExists) {
                    cliLogger.warn(
                        `Main index ${mainIndexName} not found, creating...`
                    );
                    await this.client.createIndex(mainIndexName, {
                        primaryKey: "id",
                    });
                    await this.configureIndexSettings(mainIndexName);
                }
                cliLogger.info(
                    `Using direct updates to main index: ${mainIndexName}`
                );
            } else {
                // For full updates, use the temporary index approach
                const indexExists = await this.client.existsIndex(
                    updateIndexName
                );
                if (indexExists) {
                    await this.client.deleteIndex(updateIndexName);
                    cliLogger.info(
                        `Deleted existing index: ${updateIndexName}`
                    );
                }

                await this.client.createIndex(updateIndexName, {
                    primaryKey: "id",
                });
                cliLogger.info(`Created index: ${updateIndexName}`);

                const nitroIndexExists = await this.client.existsIndex(
                    mainIndexName
                );
                if (!nitroIndexExists) {
                    cliLogger.warn(
                        `Main index ${mainIndexName} not found, creating...`
                    );
                    await this.client.createIndex(mainIndexName, {
                        primaryKey: "id",
                    });
                }

                await this.configureIndexSettings(updateIndexName);
            }

            let totalEstimatedDocs = 0;
            const estimatedCountsPerEntity: Partial<
                Record<EntityType, number>
            > = {};

            if (this.getEstimatedCountsFn) {
                cliLogger.info("Calculating estimated document counts...");
                for (const entityType of entityTypes) {
                    try {
                        const count = await this.getEstimatedCountsFn(
                            entityType
                        );
                        estimatedCountsPerEntity[entityType] = count;
                        totalEstimatedDocs += count;
                        cliLogger.info(
                            `  - ${entityType}: ${count.toLocaleString()}`
                        );
                    } catch (e: any) {
                        cliLogger.error(
                            `Error getting estimated count for ${entityType}: ${e.message}`
                        );
                        estimatedCountsPerEntity[entityType] = 0; // Assume 0 if error
                    }
                }
                cliLogger.info(
                    `Total estimated documents: ${totalEstimatedDocs.toLocaleString()}`
                );
            } else {
                cliLogger.info(
                    "No getEstimatedCountsFn provided, skipping detailed progress estimation."
                );
            }

            for (const entityType of entityTypes) {
                cliLogger.info(`Processing ${entityType}...`);
                const estimatedCountForType =
                    estimatedCountsPerEntity[entityType] ?? 0; // Use 0 if no estimate function or error

                // If no estimate function was provided, we pass 0, processEntities will handle it.
                // If an estimate function was provided but returned 0, we also pass 0.
                processedCounts[entityType] = await this.processEntities(
                    entityType,
                    estimatedCountForType,
                    targetIndexName
                );
            }

            // Only perform index swap for full updates, not direct updates
            if (!directUpdate) {
                cliLogger.info(
                    `Swapping indexes: ${mainIndexName} <--> ${updateIndexName}`
                );
                await this.client.replaceIndex(mainIndexName, updateIndexName); // replaceIndex handles the swap and deletion of the old temp
                cliLogger.info(
                    `Attempting to delete temporary index: ${updateIndexName} (if it wasn't automatically handled by replaceIndex)`
                );
                try {
                    // replaceIndex should ideally handle this, but as a fallback:
                    if (await this.client.existsIndex(updateIndexName)) {
                        await this.client.deleteIndex(updateIndexName);
                        cliLogger.info(
                            `Temporary index ${updateIndexName} deleted successfully after swap.`
                        ); // Changed from success to info
                    } else {
                        cliLogger.info(
                            `Temporary index ${updateIndexName} was already deleted or handled by replaceIndex.`
                        );
                    }
                } catch (e: any) {
                    cliLogger.warn(
                        `Could not delete temporary index ${updateIndexName} after swap (it might have been already deleted): ${e.message}`
                    );
                }
            } else {
                cliLogger.info(
                    `Direct update mode: skipping index swap, updates applied directly to ${mainIndexName}`
                );
            }

            cliLogger.info(
                "Meilisearch update process completed successfully."
            ); // Changed from success to info
            return processedCounts;
        } catch (error: any) {
            cliLogger.error("Error during Meilisearch update process:");
            cliLogger.error(error.message || error);
            if (error.stack) {
                cliLogger.error(error.stack);
            }
            // Attempt to clean up update index if it exists to prevent issues on next run
            try {
                if (await this.client.existsIndex(updateIndexName)) {
                    cliLogger.info(
                        `Attempting to delete ${updateIndexName} due to error...`
                    );
                    await this.client.deleteIndex(updateIndexName);
                    cliLogger.info(`${updateIndexName} deleted after error.`); // Changed from success to info
                }
            } catch (cleanupError: any) {
                if (cleanupError.code !== "index_not_found") {
                    // Meilisearch specific error code
                    cliLogger.error(
                        `Failed to delete ${updateIndexName} during error cleanup: ${
                            cleanupError.message || cleanupError
                        }`
                    );
                }
            }
            throw error; // Re-throw the error to indicate failure
        }
    }
}
