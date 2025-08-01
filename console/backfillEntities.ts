import { cliLogger } from "../server/helpers/Logger";
import { Characters } from "../server/models/Characters";
import { Config } from "../server/models/Config";
import { getCharacter } from "../server/helpers/ESIData";
import { queueUpdateCharacter } from "../server/queue/Character";

export default {
    name: "backfillEntities",
    description: "Finds holes in entities where there might be one",
    longRunning: false,
    run: async () => {
        cliLogger.info("Starting backfill for entities");

        try {
            // Find holes in character IDs starting from stored position or lowest ID
            const queuedCount = await findValidCharacterHoles();

            if (queuedCount > 0) {
                cliLogger.info(
                    `Successfully queued ${queuedCount} character IDs for processing`
                );
            } else {
                cliLogger.info(
                    "No valid character holes found in current batch"
                );
            }
        } catch (error) {
            cliLogger.error(`Error during backfill: ${error}`);
        }
    },
};

/**
 * Finds valid character holes by testing gaps with ESI API
 * Queues characters for processing and returns count of queued characters
 */
async function findValidCharacterHoles(): Promise<number> {
    const MIN_CHARACTER_ID = 3_999_999;
    const MAX_VALID_HOLES = 100;
    const LARGE_GAP_THRESHOLD = 50; // Test large gaps with ESI
    const DEAD_ZONE_THRESHOLD = 3; // Number of consecutive large gaps with no results before jumping
    const CONFIG_KEY = "backfill_entities_progress";

    let consecutiveDeadGaps = 0; // Track consecutive large gaps with no results
    let queuedCount = 0; // Track how many characters we've queued

    // Get the maximum character ID to calculate progress
    const maxCharacter = await Characters.findOne({}, { character_id: 1 })
        .sort({ character_id: -1 })
        .lean();

    const maxCharacterId = maxCharacter?.character_id || 0;
    cliLogger.info(`Maximum known character ID: ${maxCharacterId}`);

    // Get last processed position from config
    let currentId: number;
    const progressConfig = await Config.findOne({ key: CONFIG_KEY });

    if (progressConfig) {
        currentId = parseInt(progressConfig.value);
        cliLogger.info(`Resuming from stored position: ${currentId}`);
    } else {
        // Find the lowest character ID above MIN_CHARACTER_ID
        const lowestCharacter = await Characters.findOne(
            {
                character_id: { $gt: MIN_CHARACTER_ID },
            },
            { character_id: 1 }
        )
            .sort({ character_id: 1 })
            .lean();

        if (!lowestCharacter) {
            cliLogger.warn(
                "No characters found above the minimum ID threshold"
            );
            return 0;
        }

        currentId = lowestCharacter.character_id;
        cliLogger.info(`Starting from lowest character ID: ${currentId}`);
    }

    while (queuedCount < MAX_VALID_HOLES) {
        const missingIds: number[] = [];
        let checkId = currentId;
        let shouldJumpToNextKnownCharacter = false; // Flag to control main loop flow

        // Check a batch of 100 IDs to see what's missing
        const batchSize = 100;
        const endId = checkId + batchSize - 1;

        // Get all existing characters in this range
        const existingCharacters = await Characters.find(
            {
                character_id: {
                    $gte: checkId,
                    $lte: endId,
                },
            },
            { character_id: 1 }
        )
            .sort({ character_id: 1 })
            .lean();

        const existingIds = new Set(
            existingCharacters.map((char) => char.character_id)
        );

        // Find all missing IDs in this batch
        for (let id = checkId; id <= endId; id++) {
            if (!existingIds.has(id)) {
                missingIds.push(id);
            }
        }

        if (missingIds.length === 0) {
            // No missing IDs in this batch, move to next batch
            currentId = endId + 1;
            await saveProgress(CONFIG_KEY, currentId);
            continue;
        }

        cliLogger.info(
            `Found ${missingIds.length} missing IDs in batch ${checkId}-${endId}`
        );

        // Analyze the missing IDs pattern
        const gapGroups = findConsecutiveGaps(missingIds);

        for (const gap of gapGroups) {
            if (queuedCount >= MAX_VALID_HOLES) break;

            if (gap.length >= LARGE_GAP_THRESHOLD) {
                // Large gap - test middle ID with ESI
                const middleIndex = Math.floor(gap.length / 2);
                const testId = gap[middleIndex];

                if (testId === undefined) {
                    cliLogger.error("Test ID is undefined, skipping gap");
                    continue;
                }

                cliLogger.info(
                    `Large gap detected (${gap.length} IDs). Testing middle ID ${testId} with ESI...`
                );

                try {
                    const characterData = await getCharacter(testId);

                    if (
                        characterData.error === "Character not found" ||
                        characterData.deleted === true
                    ) {
                        consecutiveDeadGaps++;
                        cliLogger.info(
                            `Character ID ${testId} not found/deleted in EVE. Skipping gap ${
                                gap[0]
                            }-${
                                gap[gap.length - 1]
                            }. (Dead gaps: ${consecutiveDeadGaps})`
                        );

                        // Check if we've hit too many consecutive dead gaps
                        if (consecutiveDeadGaps >= DEAD_ZONE_THRESHOLD) {
                            cliLogger.warn(
                                `Hit ${DEAD_ZONE_THRESHOLD} consecutive dead gaps. Looking for next known character ID to jump ahead...`
                            );

                            // Find the next known character ID in the database
                            const nextKnownCharacter = await Characters.findOne(
                                {
                                    character_id: { $gt: testId },
                                },
                                { character_id: 1 }
                            )
                                .sort({ character_id: 1 })
                                .lean();

                            if (nextKnownCharacter) {
                                const jumpDistance =
                                    nextKnownCharacter.character_id - currentId;
                                cliLogger.info(
                                    `Found next known character at ID ${
                                        nextKnownCharacter.character_id
                                    }. Jumping ${jumpDistance.toLocaleString()} IDs ahead from dead zone.`
                                );

                                // Jump to just before the next known character to start scanning from there
                                currentId = nextKnownCharacter.character_id - 1;
                                consecutiveDeadGaps = 0; // Reset counter
                                await saveProgress(CONFIG_KEY, currentId);
                                shouldJumpToNextKnownCharacter = true;
                                break; // Break out of gap processing to start new batch
                            } else {
                                cliLogger.warn(
                                    `No more characters found beyond ID ${testId}. Might be at the end of character space.`
                                );
                                return queuedCount; // Return what we have so far
                            }
                        }

                        // Skip this entire gap
                        continue;
                    } else {
                        consecutiveDeadGaps = 0; // Reset counter on finding valid character
                        cliLogger.info(
                            `✓ Character ID ${testId} exists in EVE! Large gap contains valid characters.`
                        );
                        // Queue a few IDs from this gap for processing
                        const idsToQueue = gap.slice(
                            0,
                            Math.min(10, gap.length)
                        );
                        for (const id of idsToQueue) {
                            if (queuedCount < MAX_VALID_HOLES) {
                                await queueUpdateCharacter(id, 1, 1); // Priority 1, attempts 1 (no retries for backfill)
                                queuedCount++;
                                const remaining = maxCharacterId - id;
                                cliLogger.info(
                                    `Queued character ID ${id} for processing (${queuedCount}/${MAX_VALID_HOLES}) - ${remaining.toLocaleString()} IDs remaining to max`
                                );
                            }
                        }
                    }
                } catch (error) {
                    const errorMessage =
                        error instanceof Error ? error.message : String(error);
                    cliLogger.error(
                        `Error testing character ID ${testId}: ${errorMessage}`
                    );
                    // On error, skip this gap
                    continue;
                }
            } else {
                // Small gap - assume these are valid characters that exist
                consecutiveDeadGaps = 0; // Reset counter on finding small gaps (likely valid)
                cliLogger.info(
                    `Small gap detected (${gap.length} IDs): ${gap[0]}-${
                        gap[gap.length - 1]
                    }. Queuing for processing.`
                );
                for (const id of gap) {
                    if (queuedCount < MAX_VALID_HOLES) {
                        await queueUpdateCharacter(id, 1, 1); // Priority 1, attempts 1 (no retries for backfill)
                        queuedCount++;
                        const remaining = maxCharacterId - id;
                        cliLogger.info(
                            `Queued character ID ${id} for processing (${queuedCount}/${MAX_VALID_HOLES}) - ${remaining.toLocaleString()} IDs remaining to max`
                        );
                    }
                }
            }
        }

        // Check if we should jump instead of incrementing normally
        if (shouldJumpToNextKnownCharacter) {
            // Don't increment currentId, we already set it to the jump position
            continue; // Skip the normal increment and start next iteration
        }

        // Move to next batch
        currentId = endId + 1;
        await saveProgress(CONFIG_KEY, currentId);
    }

    // Save progress before returning
    await saveProgress(CONFIG_KEY, currentId);
    return queuedCount;
}

/**
 * Groups consecutive missing IDs into separate gap arrays
 */
function findConsecutiveGaps(missingIds: number[]): number[][] {
    if (missingIds.length === 0) return [];

    const gaps: number[][] = [];
    const firstId = missingIds[0];
    if (firstId === undefined) return [];

    let currentGap: number[] = [firstId];

    for (let i = 1; i < missingIds.length; i++) {
        const currentId = missingIds[i];
        const previousId = missingIds[i - 1];

        if (currentId === undefined || previousId === undefined) {
            continue;
        }

        if (currentId === previousId + 1) {
            // Consecutive ID, add to current gap
            currentGap.push(currentId);
        } else {
            // Non-consecutive ID, start a new gap
            gaps.push(currentGap);
            currentGap = [currentId];
        }
    }

    // Don't forget the last gap
    gaps.push(currentGap);

    return gaps;
}

/**
 * Save the current progress to config
 */
async function saveProgress(key: string, value: number): Promise<void> {
    try {
        await Config.updateOne(
            { key },
            { key, value: value.toString() },
            { upsert: true }
        );
    } catch (error) {
        const errorMessage =
            error instanceof Error ? error.message : String(error);
        cliLogger.error(`Error saving progress: ${errorMessage}`);
    }
}
