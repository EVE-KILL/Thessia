import { cliLogger } from "~/server/helpers/Logger";
import { getCachedCorporation } from "~/server/helpers/RuntimeCache";
import { Characters } from "~/server/models/Characters";
import { queueBulkUpdateAlliances } from "~/server/queue/Alliance";
import { queueBulkUpdateCharacters } from "~/server/queue/Character";
import { queueBulkUpdateCorporations } from "~/server/queue/Corporation";

interface ProcessingResult {
    processed: number;
    missingCorporations: MissingCorporation[];
    outliers: OutlierData[];
    queued: number;
}

interface OutlierData {
    character_id: number;
    character_name: string;
    corporation_id: number;
    current_alliance_id: number;
    expected_alliance_id: number;
    issue_type: "alliance_mismatch";
}

interface MissingCorporation {
    corporation_id: number;
    character_count: number;
}

export default {
    name: "fixAllianceOutliers",
    description:
        "Finds and fixes characters with incorrect alliance data based on their corporation",
    longRunning: false,
    run: async () => {
        cliLogger.info("Starting alliance outlier detection and fixing...");
        const startTime = Date.now();

        try {
            // Single pass processing: find missing corporations AND alliance outliers
            cliLogger.info(
                "Processing characters for missing corporations and alliance outliers..."
            );
            const result = await processCharactersForOutliers();

            // Phase 1: Queue missing corporations first
            if (result.missingCorporations.length > 0) {
                cliLogger.info(
                    `Found ${result.missingCorporations.length} missing corporations, queuing for fetching...`
                );
                await queueMissingCorporations(result.missingCorporations);

                // Wait a bit for corporation data to be fetched before proceeding with outliers
                if (result.outliers.length > 0) {
                    cliLogger.info(
                        "Waiting 30 seconds for corporation data to be fetched..."
                    );
                    await new Promise((resolve) => setTimeout(resolve, 30000));
                }
            }

            // Phase 2: Queue outliers for fixing
            if (result.outliers.length > 0) {
                cliLogger.info("Queuing alliance outliers for fixing...");
                await queueOutliersForFixing(result.outliers);
            }

            const elapsed = (Date.now() - startTime) / 1000;
            cliLogger.info(`Completed in ${elapsed.toFixed(2)} seconds`);
            cliLogger.info(`Processed ${result.processed} characters`);
            cliLogger.info(
                `Found ${result.missingCorporations.length} missing corporations`
            );
            cliLogger.info(`Found ${result.outliers.length} alliance outliers`);
            cliLogger.info(`Queued ${result.queued} entities for updates`);

            if (result.outliers.length > 0) {
                cliLogger.info("Outlier breakdown:");
                cliLogger.info(
                    `  - Alliance mismatches: ${result.outliers.length}`
                );

                // Log first few examples
                const examples = result.outliers.slice(0, 5);
                cliLogger.info("First few examples:");
                examples.forEach((outlier: OutlierData) => {
                    cliLogger.info(
                        `  - Character ${outlier.character_name} (${outlier.character_id}): ${outlier.issue_type}`
                    );
                    cliLogger.info(
                        `    Alliance: ${outlier.current_alliance_id} -> ${outlier.expected_alliance_id}`
                    );
                });
            }
        } catch (error) {
            cliLogger.error(
                `Error during outlier detection: ${
                    error instanceof Error ? error.message : String(error)
                }`
            );
        }
    },
};

/**
 * Single pass processing: Find missing corporations AND alliance outliers simultaneously
 */
async function processCharactersForOutliers(): Promise<ProcessingResult> {
    cliLogger.info("Processing characters in single pass...");

    const missingCorporations = new Map<number, number>(); // corporation_id -> character_count
    const outliers: OutlierData[] = [];

    let processed = 0;
    let cacheHits = 0;
    let cacheMisses = 0;

    // Process characters in larger batches for memory efficiency
    const BATCH_SIZE = 1000; // 1k characters at a time
    let skip = 0;

    while (true) {
        const characters = await Characters.find(
            { deleted: false },
            {
                character_id: 1,
                name: 1,
                corporation_id: 1,
                alliance_id: 1,
            }
        )
            .skip(skip)
            .limit(BATCH_SIZE)
            .lean();

        if (characters.length === 0) {
            break;
        }

        cliLogger.info(
            `Processing batch of ${characters.length} characters (${
                skip + 1
            } to ${skip + characters.length})`
        );

        for (const character of characters) {
            processed++;

            // Skip characters without corporation
            if (!character.corporation_id || character.corporation_id === 0) {
                continue;
            }

            // Get corporation data from RuntimeCache (handles LRU + Redis + DB automatically)
            const corporationData = await getCachedCorporation(
                character.corporation_id
            );

            if (!corporationData) {
                // Corporation not found - mark as missing
                const count =
                    missingCorporations.get(character.corporation_id) || 0;
                missingCorporations.set(character.corporation_id, count + 1);
                cacheMisses++;
                continue;
            }

            cacheHits++;

            // Compare character data with expected corporation data
            const currentAllianceId = character.alliance_id || 0;
            const expectedAllianceId = corporationData.alliance_id || 0;

            const allianceMismatch = currentAllianceId !== expectedAllianceId;

            if (allianceMismatch) {
                cliLogger.debug(
                    `OUTLIER: Character ${character.character_id} (${
                        character.name || "Unknown"
                    }) has alliance ${currentAllianceId} but corporation ${
                        character.corporation_id
                    } has alliance ${expectedAllianceId}`
                );

                outliers.push({
                    character_id: character.character_id,
                    character_name: character.name || "Unknown",
                    corporation_id: character.corporation_id,
                    current_alliance_id: currentAllianceId,
                    expected_alliance_id: expectedAllianceId,
                    issue_type: "alliance_mismatch",
                });
            }
        }

        skip += BATCH_SIZE;
        cliLogger.info(
            `Processed ${processed} characters so far, found ${missingCorporations.size} missing corporations and ${outliers.length} outliers`
        );
    }

    const missingCorpsArray = Array.from(missingCorporations.entries()).map(
        ([corporation_id, character_count]) => ({
            corporation_id,
            character_count,
        })
    );

    cliLogger.info(
        `Cache efficiency: ${cacheHits} hits, ${cacheMisses} misses (${(
            (cacheHits / (cacheHits + cacheMisses)) *
            100
        ).toFixed(2)}% hit rate)`
    );
    cliLogger.info(
        `Found ${
            missingCorpsArray.length
        } missing corporations affecting ${missingCorpsArray.reduce(
            (sum, c) => sum + c.character_count,
            0
        )} characters`
    );

    return {
        processed,
        missingCorporations: missingCorpsArray,
        outliers,
        queued: 0, // Will be calculated when queuing
    };
}

/**
 * Queue outliers for fixing in bulk batches
 */
async function queueOutliersForFixing(outliers: OutlierData[]): Promise<void> {
    const BATCH_SIZE = 1000; // 1k outliers at a time

    // Collect unique entities to queue
    const charactersToQueue = new Set<number>();
    const corporationsToQueue = new Set<number>();
    const alliancesToQueue = new Set<number>();

    for (const outlier of outliers) {
        charactersToQueue.add(outlier.character_id);
        corporationsToQueue.add(outlier.corporation_id);

        if (outlier.current_alliance_id > 0) {
            alliancesToQueue.add(outlier.current_alliance_id);
        }
        if (
            outlier.expected_alliance_id > 0 &&
            outlier.expected_alliance_id !== outlier.current_alliance_id
        ) {
            alliancesToQueue.add(outlier.expected_alliance_id);
        }
    }

    // Queue entities in batches
    await queueEntitiesBatch(
        charactersToQueue,
        corporationsToQueue,
        alliancesToQueue
    );

    cliLogger.info(
        `Queued ${charactersToQueue.size} characters, ${corporationsToQueue.size} corporations, and ${alliancesToQueue.size} alliances for updates`
    );
}

/**
 * Queue missing corporations for fetching in batches
 */
async function queueMissingCorporations(
    missingCorporations: MissingCorporation[]
): Promise<void> {
    const BATCH_SIZE = 10000;

    // Sort by character count (descending) to prioritize corporations with more characters
    const sortedCorps = missingCorporations.sort(
        (a, b) => b.character_count - a.character_count
    );

    for (let i = 0; i < sortedCorps.length; i += BATCH_SIZE) {
        const batch = sortedCorps.slice(i, i + BATCH_SIZE);
        const corporationsToQueue = batch.map((corp) => ({
            corporationId: corp.corporation_id,
            priority: corp.character_count > 100 ? 10 : 5, // Higher priority for corps with many characters
        }));

        await queueBulkUpdateCorporations(corporationsToQueue);
        cliLogger.info(
            `Queued ${corporationsToQueue.length} corporations (batch ${
                Math.floor(i / BATCH_SIZE) + 1
            })`
        );
    }
}

/**
 * Queue entities in bulk batches
 */
async function queueEntitiesBatch(
    charactersToQueue: Set<number>,
    corporationsToQueue: Set<number>,
    alliancesToQueue: Set<number>
): Promise<void> {
    // Queue characters
    if (charactersToQueue.size > 0) {
        const characters = Array.from(charactersToQueue).map((characterId) => ({
            characterId,
            priority: 5,
        }));
        await queueBulkUpdateCharacters(characters);
        cliLogger.info(`Queued ${characters.length} characters for update`);
    }

    // Queue corporations
    if (corporationsToQueue.size > 0) {
        const corporations = Array.from(corporationsToQueue).map(
            (corporationId) => ({
                corporationId,
                priority: 5,
            })
        );
        await queueBulkUpdateCorporations(corporations);
        cliLogger.info(`Queued ${corporations.length} corporations for update`);
    }

    // Queue alliances
    if (alliancesToQueue.size > 0) {
        const alliances = Array.from(alliancesToQueue).map((allianceId) => ({
            allianceId,
            priority: 5,
        }));
        await queueBulkUpdateAlliances(alliances);
        cliLogger.info(`Queued ${alliances.length} alliances for update`);
    }
}
