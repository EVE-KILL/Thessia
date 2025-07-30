import { cliLogger } from "~/server/helpers/Logger";
import { Characters } from "~/server/models/Characters";
import { Corporations } from "~/server/models/Corporations";
import { queueBulkUpdateAlliances } from "~/server/queue/Alliance";
import { queueBulkUpdateCharacters } from "~/server/queue/Character";
import { queueBulkUpdateCorporations } from "~/server/queue/Corporation";

interface ProcessingResult {
    processed: number;
    missingCorporations: MissingCorporation[];
    outliers: OutlierData[];
    queued: number;
    corporationsLoaded: number;
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

interface CorporationData {
    corporation_id: number;
    alliance_id: number;
}

export default {
    name: "fixAllianceOutliers",
    description:
        "Finds and fixes characters with incorrect alliance data based on their corporation. Use --skip <number> to resume processing from a specific character position.",
    longRunning: false,
    run: async (args?: string[]) => {
        cliLogger.info("Starting alliance outlier detection and fixing...");
        const startTime = Date.now();

        // Parse command line arguments
        let skipCount = 0;
        if (args) {
            const skipIndex = args.findIndex((arg) => arg === "--skip");
            if (skipIndex !== -1 && skipIndex + 1 < args.length) {
                const skipArg = args[skipIndex + 1];
                if (skipArg) {
                    const skipValue = parseInt(skipArg, 10);
                    if (!isNaN(skipValue) && skipValue >= 0) {
                        skipCount = skipValue;
                        cliLogger.info(
                            `Skipping first ${skipCount.toLocaleString()} characters`
                        );
                    } else {
                        cliLogger.error(
                            "Invalid skip value. Must be a non-negative integer."
                        );
                        return;
                    }
                }
            }
        }

        try {
            // Preload all corporations into memory for instant lookups
            cliLogger.info("Preloading all corporations into memory...");
            const corporationMap = await preloadCorporations();

            // Single pass processing: find missing corporations AND alliance outliers
            // Entities are queued immediately as they're found
            cliLogger.info(
                "Processing characters for missing corporations and alliance outliers (queuing immediately)..."
            );
            const result = await processCharactersForOutliers(
                corporationMap,
                skipCount
            );

            const elapsed = (Date.now() - startTime) / 1000;
            cliLogger.info(`Completed in ${elapsed.toFixed(2)} seconds`);
            cliLogger.info(
                `Loaded ${result.corporationsLoaded} corporations into memory`
            );
            if (skipCount > 0) {
                cliLogger.info(
                    `Skipped first ${skipCount.toLocaleString()} characters`
                );
                cliLogger.info(
                    `Processed ${result.processed} characters in this run`
                );
                cliLogger.info(
                    `Total position reached: ${(
                        skipCount + result.processed
                    ).toLocaleString()}`
                );
            } else {
                cliLogger.info(`Processed ${result.processed} characters`);
            }
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
 * Preload all corporations into memory for instant lookups using cursor
 * Returns a Map with corporation_id -> {corporation_id, alliance_id}
 */
async function preloadCorporations(): Promise<Map<number, CorporationData>> {
    const startTime = Date.now();
    cliLogger.info("Loading all corporations from database using cursor...");

    const corporationMap = new Map<number, CorporationData>();
    let count = 0;

    // Use cursor to stream corporations directly into the Map
    const cursor = Corporations.find(
        { deleted: false },
        {
            corporation_id: 1,
            alliance_id: 1,
        }
    )
        .lean()
        .cursor();

    for (
        let corp = await cursor.next();
        corp != null;
        corp = await cursor.next()
    ) {
        corporationMap.set(corp.corporation_id, {
            corporation_id: corp.corporation_id,
            alliance_id: corp.alliance_id || 0,
        });
        count++;

        // Log progress every 100k corporations
        if (count % 100000 === 0) {
            cliLogger.info(`Loaded ${count} corporations...`);
        }
    }

    const elapsed = (Date.now() - startTime) / 1000;
    const memoryUsage = (corporationMap.size * 16) / 1024 / 1024; // Rough estimate: 16 bytes per entry

    cliLogger.info(
        `Loaded ${corporationMap.size} corporations in ${elapsed.toFixed(2)}s`
    );
    cliLogger.info(`Estimated memory usage: ${memoryUsage.toFixed(1)}MB`);

    return corporationMap;
}

/**
 * Single pass processing: Find missing corporations AND alliance outliers simultaneously
 * Queue entities immediately as they're found
 */
async function processCharactersForOutliers(
    corporationMap: Map<number, CorporationData>,
    skipCount: number = 0
): Promise<ProcessingResult> {
    cliLogger.info("Processing characters in single pass...");

    const queuedCorporations = new Set<number>(); // Track already queued corporations
    const missingCorporations: MissingCorporation[] = [];
    const outliers: OutlierData[] = [];

    let processed = 0;
    let lookups = 0;
    let queuedCount = 0;

    // Process characters in larger batches for memory efficiency
    const BATCH_SIZE = 10000; // 10k characters at a time
    let skip = skipCount; // Start from the specified skip count

    cliLogger.info(
        `Starting character processing from position ${skip.toLocaleString()}`
    );

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

            // Get corporation data from preloaded map - instant lookup!
            const corporationData = corporationMap.get(
                character.corporation_id
            );
            lookups++;

            if (!corporationData) {
                // Corporation not found - queue it immediately if not already queued
                if (!queuedCorporations.has(character.corporation_id)) {
                    cliLogger.debug(
                        `MISSING CORP: Queuing corporation ${
                            character.corporation_id
                        } for character ${character.character_id} (position ${
                            skip + processed
                        })`
                    );

                    await queueBulkUpdateCorporations([
                        {
                            corporationId: character.corporation_id,
                            priority: 5,
                        },
                    ]);

                    queuedCorporations.add(character.corporation_id);
                    queuedCount++;

                    missingCorporations.push({
                        corporation_id: character.corporation_id,
                        character_count: 1,
                    });
                }
                continue;
            }

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
                    } has alliance ${expectedAllianceId} (position ${
                        skip + processed
                    })`
                );

                // Queue the outlier immediately
                await queueOutlierImmediately({
                    character_id: character.character_id,
                    character_name: character.name || "Unknown",
                    corporation_id: character.corporation_id,
                    current_alliance_id: currentAllianceId,
                    expected_alliance_id: expectedAllianceId,
                    issue_type: "alliance_mismatch",
                });

                queuedCount += 3; // character + corporation + alliance(s)

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
            `Processed ${
                skipCount + processed
            } characters total (${processed} in this run), found ${
                queuedCorporations.size
            } missing corporations and ${outliers.length} outliers`
        );
    }

    cliLogger.info(
        `Lookup efficiency: ${lookups} instant lookups from preloaded map`
    );

    return {
        processed,
        missingCorporations,
        outliers,
        queued: queuedCount,
        corporationsLoaded: corporationMap.size,
    };
}

/**
 * Queue a single outlier immediately for fixing
 */
async function queueOutlierImmediately(outlier: OutlierData): Promise<void> {
    // Queue character
    await queueBulkUpdateCharacters([
        {
            characterId: outlier.character_id,
            priority: 5,
        },
    ]);

    // Queue corporation
    await queueBulkUpdateCorporations([
        {
            corporationId: outlier.corporation_id,
            priority: 5,
        },
    ]);

    // Queue alliances if they exist
    const alliancesToQueue: { allianceId: number; priority: number }[] = [];

    if (outlier.current_alliance_id > 0) {
        alliancesToQueue.push({
            allianceId: outlier.current_alliance_id,
            priority: 5,
        });
    }
    if (
        outlier.expected_alliance_id > 0 &&
        outlier.expected_alliance_id !== outlier.current_alliance_id
    ) {
        alliancesToQueue.push({
            allianceId: outlier.expected_alliance_id,
            priority: 5,
        });
    }

    if (alliancesToQueue.length > 0) {
        await queueBulkUpdateAlliances(alliancesToQueue);
    }
}
