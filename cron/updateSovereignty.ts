import { cliLogger } from "../server/helpers/Logger";
import {
    getAlliance,
    getCorporation,
    getSovereigntyMap,
} from "../server/helpers/ESIData";
import { Sovereignty } from "../server/models/Sovereignty";

export default {
    name: "updateSovereignty",
    description: "Update sovereignty data from ESI",
    schedule: "0 */6 * * *", // Run every 6 hours
    run: async () => {
        cliLogger.info("Starting sovereignty update...");

        try {
            // Fetch sovereignty data from ESI
            const sovereigntyData = await getSovereigntyMap();
            cliLogger.info(
                `Fetched ${sovereigntyData.length} sovereignty entries`
            );

            const now = new Date();
            const bulkOps: any[] = [];

            // Process each sovereignty entry
            for (const sovEntry of sovereigntyData) {
                if (!sovEntry.system_id) continue;

                // Get existing sovereignty document for this system
                const existingSov = await Sovereignty.findOne({
                    system_id: sovEntry.system_id,
                });

                // Check if sovereignty has changed
                const sovereigntyChanged =
                    !existingSov ||
                    existingSov.alliance_id !==
                        (sovEntry.alliance_id || undefined) ||
                    existingSov.corporation_id !==
                        (sovEntry.corporation_id || undefined) ||
                    existingSov.faction_id !==
                        (sovEntry.faction_id || undefined);

                if (sovereigntyChanged) {
                    const sovereigntyRecord = {
                        system_id: sovEntry.system_id,
                        alliance_id: sovEntry.alliance_id || undefined,
                        corporation_id: sovEntry.corporation_id || undefined,
                        faction_id: sovEntry.faction_id || undefined,
                        alliance_name: undefined as string | undefined,
                        corporation_name: undefined as string | undefined,
                        date_added: now,
                    };

                    // Fetch names for alliance and corporation
                    if (sovEntry.alliance_id) {
                        try {
                            const allianceData = await getAlliance(
                                sovEntry.alliance_id
                            );
                            sovereigntyRecord.alliance_name = allianceData.name;
                        } catch (error) {
                            cliLogger.warn(
                                `Failed to fetch alliance name for ${
                                    sovEntry.alliance_id
                                }: ${
                                    error instanceof Error
                                        ? error.message
                                        : String(error)
                                }`
                            );
                        }
                    }

                    if (sovEntry.corporation_id) {
                        try {
                            const corpData = await getCorporation(
                                sovEntry.corporation_id
                            );
                            sovereigntyRecord.corporation_name = corpData.name;
                        } catch (error) {
                            cliLogger.warn(
                                `Failed to fetch corporation name for ${
                                    sovEntry.corporation_id
                                }: ${
                                    error instanceof Error
                                        ? error.message
                                        : String(error)
                                }`
                            );
                        }
                    }

                    if (existingSov) {
                        // Update existing document: move current data to history and update current
                        const historyEntry = {
                            alliance_id: existingSov.alliance_id,
                            alliance_name: existingSov.alliance_name,
                            corporation_id: existingSov.corporation_id,
                            corporation_name: existingSov.corporation_name,
                            faction_id: existingSov.faction_id,
                            date_added: existingSov.date_added,
                        };

                        bulkOps.push({
                            updateOne: {
                                filter: { system_id: sovEntry.system_id },
                                update: {
                                    $set: {
                                        alliance_id:
                                            sovereigntyRecord.alliance_id,
                                        alliance_name:
                                            sovereigntyRecord.alliance_name,
                                        corporation_id:
                                            sovereigntyRecord.corporation_id,
                                        corporation_name:
                                            sovereigntyRecord.corporation_name,
                                        faction_id:
                                            sovereigntyRecord.faction_id,
                                        date_added:
                                            sovereigntyRecord.date_added,
                                    },
                                    $push: { history: historyEntry },
                                },
                            },
                        });
                    } else {
                        // Create new document for this system
                        bulkOps.push({
                            insertOne: {
                                document: {
                                    ...sovereigntyRecord,
                                    history: [],
                                },
                            },
                        });
                    }
                }
            }

            // Execute all bulk operations
            if (bulkOps.length > 0) {
                await Sovereignty.bulkWrite(bulkOps);
                cliLogger.info(
                    `Processed ${bulkOps.length} sovereignty changes`
                );
            } else {
                cliLogger.info("No sovereignty changes detected");
            }

            cliLogger.info("Sovereignty update completed successfully");
        } catch (error) {
            cliLogger.error(
                `Failed to update sovereignty: ${
                    error instanceof Error ? error.message : String(error)
                }`
            );
            throw error;
        }
    },
};
