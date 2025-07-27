import { cliLogger } from "~/server/helpers/Logger";
import { Characters } from "~/server/models/Characters";
import { Corporations } from "~/server/models/Corporations";
import { Alliances } from "~/server/models/Alliances";
import { queueUpdateCharacter } from "~/server/queue/Character";
import { queueUpdateCorporation } from "~/server/queue/Corporation";
import { queueUpdateAlliance } from "~/server/queue/Alliance";
import { getCorporation } from "~/server/helpers/ESIData";

interface CorporationCache {
    alliance_id: number;
}

interface OutlierData {
    character_id: number;
    character_name: string;
    corporation_id: number;
    current_alliance_id: number;
    expected_alliance_id: number;
    issue_type: "alliance_mismatch";
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
            const result = await findAndFixOutliers();

            const elapsed = (Date.now() - startTime) / 1000;
            cliLogger.info(`Completed in ${elapsed.toFixed(2)} seconds`);
            cliLogger.info(`Processed ${result.processed} characters`);
            cliLogger.info(`Found ${result.outliers.length} outliers`);
            cliLogger.info(`Queued ${result.queued} characters for updates`);

            if (result.outliers.length > 0) {
                cliLogger.info("Outlier breakdown:");
                cliLogger.info(
                    `  - Alliance mismatches: ${result.outliers.length}`
                );

                // Log first few examples
                const examples = result.outliers.slice(0, 5);
                cliLogger.info("First few examples:");
                examples.forEach((outlier) => {
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
 * Find and fix alliance/faction outliers using smart caching
 */
async function findAndFixOutliers(): Promise<{
    processed: number;
    outliers: OutlierData[];
    queued: number;
}> {
    const corporationCache = new Map<number, CorporationCache>();
    const outliers: OutlierData[] = [];

    let processed = 0;
    let queued = 0;
    let dbQueries = 0;

    // Process characters in batches for memory efficiency
    const BATCH_SIZE = 1000;
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

        for (const character of characters) {
            processed++;

            // Skip characters without corporation
            if (!character.corporation_id || character.corporation_id === 0) {
                cliLogger.warn(
                    `Skipping character ${character.character_id} (${
                        character.name || "Unknown"
                    }) - no corporation`
                );
                continue;
            }

            // Get or fetch corporation data
            let corporationData = corporationCache.get(
                character.corporation_id
            );
            if (!corporationData) {
                const corporation = await Corporations.findOne(
                    { corporation_id: character.corporation_id },
                    {
                        alliance_id: 1,
                    }
                ).lean();

                dbQueries++;

                if (!corporation) {
                    // Corporation not found in database, fetch from ESI
                    try {
                        cliLogger.warn(
                            `Corporation ${
                                character.corporation_id
                            } not in database for character ${
                                character.character_id
                            } (${
                                character.name || "Unknown"
                            }), fetching from ESI`
                        );
                        const esiCorporation = await getCorporation(
                            character.corporation_id
                        );

                        corporationData = {
                            alliance_id: esiCorporation.alliance_id || 0,
                        };

                        dbQueries++; // ESI call + database save
                        cliLogger.info(
                            `Successfully fetched corporation ${character.corporation_id} from ESI, alliance_id: ${corporationData.alliance_id}`
                        );
                    } catch (error) {
                        cliLogger.error(
                            `Failed to fetch corporation ${
                                character.corporation_id
                            } from ESI for character ${
                                character.character_id
                            }: ${
                                error instanceof Error
                                    ? error.message
                                    : String(error)
                            }`
                        );
                        continue;
                    }
                } else {
                    corporationData = {
                        alliance_id: corporation.alliance_id || 0,
                    };
                }

                corporationCache.set(character.corporation_id, corporationData);
            }

            // Compare character data with expected corporation data
            const currentAllianceId = character.alliance_id || 0;
            const expectedAllianceId = corporationData.alliance_id;

            const allianceMismatch = currentAllianceId !== expectedAllianceId;

            if (allianceMismatch) {
                cliLogger.error(
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

                // Queue character for update to fix the outlier
                await queueUpdateCharacter(character.character_id);
                queued++;
                cliLogger.info(
                    `Queued character ${character.character_id} for update`
                );

                // Also queue corporation update to ensure it has fresh data
                await queueUpdateCorporation(character.corporation_id);
                cliLogger.info(
                    `Queued corporation ${character.corporation_id} for update`
                );

                // If either character or corporation has an alliance, queue those for update too
                if (currentAllianceId > 0) {
                    await queueUpdateAlliance(currentAllianceId);
                    cliLogger.info(
                        `Queued alliance ${currentAllianceId} (character's current) for update`
                    );
                }
                if (
                    expectedAllianceId > 0 &&
                    expectedAllianceId !== currentAllianceId
                ) {
                    await queueUpdateAlliance(expectedAllianceId);
                    cliLogger.info(
                        `Queued alliance ${expectedAllianceId} (corporation's) for update`
                    );
                }
            }
        }

        skip += BATCH_SIZE;
    }

    cliLogger.info(
        `Cache efficiency: Corporation cache size: ${corporationCache.size}`
    );
    cliLogger.info(`Total database queries: ${dbQueries}`);

    return {
        processed,
        outliers,
        queued,
    };
}
