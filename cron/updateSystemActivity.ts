import type { AnyBulkWriteOperation } from "mongoose";
import { getSystemJumps, getSystemKills } from "../server/helpers/ESIData";
import { cliLogger } from "../server/helpers/Logger";
import { SolarSystems } from "../server/models/SolarSystems";

export default {
    name: "updateSystemActivity",
    description: "Update system activity data (jumps, kills)",
    schedule: "0 * * * *", // Run every hour at minute 0
    run: async () => {
        cliLogger.info("Starting system activity update...");

        try {
            // Fetch all data from ESI
            const [jumpsData, killsData] = await Promise.all([
                getSystemJumps(),
                getSystemKills(),
            ]);

            cliLogger.info(
                `Fetched ${jumpsData.length} jump entries, ${killsData.length} kill entries`
            );

            const now = new Date();
            const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

            // Get all systems that need updating
            const systems = await SolarSystems.find(
                {},
                {
                    system_id: 1,
                    jumps_24h: 1,
                    kills_24h: 1,
                }
            );

            cliLogger.info(`Processing ${systems.length} systems`);

            const bulkOps: AnyBulkWriteOperation[] = [];
            let updated = 0;

            for (const systemDoc of systems) {
                const system = systemDoc.toObject() as any;
                const systemId = system.system_id;
                let needsUpdate = false;
                const updateData: any = {};

                // Process jumps data
                const jumpEntry = jumpsData.find(
                    (entry: any) => entry.system_id === systemId
                );
                if (jumpEntry) {
                    const newJumpEntry = {
                        timestamp: now,
                        ship_jumps: jumpEntry.ship_jumps || 0,
                    };

                    // Clean up old entries (keep only last 24 hours) and add new entry
                    const currentJumps = system.jumps_24h || [];
                    const filteredJumps = currentJumps.filter(
                        (entry: any) => new Date(entry.timestamp) > oneDayAgo
                    );
                    filteredJumps.push(newJumpEntry);

                    updateData.jumps_24h = filteredJumps;
                    needsUpdate = true;
                }

                // Process kills data
                const killEntry = killsData.find(
                    (entry: any) => entry.system_id === systemId
                );
                if (killEntry) {
                    const newKillEntry = {
                        timestamp: now,
                        ship_kills: killEntry.ship_kills || 0,
                        npc_kills: killEntry.npc_kills || 0,
                        pod_kills: killEntry.pod_kills || 0,
                    };

                    // Clean up old entries (keep only last 24 hours) and add new entry
                    const currentKills = system.kills_24h || [];
                    const filteredKills = currentKills.filter(
                        (entry: any) => new Date(entry.timestamp) > oneDayAgo
                    );
                    filteredKills.push(newKillEntry);

                    updateData.kills_24h = filteredKills;
                    needsUpdate = true;
                }

                if (needsUpdate) {
                    updateData.updatedAt = now;

                    // Separate $push operations from regular field updates
                    const pushOps = updateData.$push;
                    delete updateData.$push;

                    const updateOperation: any = {};
                    if (Object.keys(updateData).length > 0) {
                        updateOperation.$set = updateData;
                    }
                    if (pushOps) {
                        updateOperation.$push = pushOps;
                    }

                    bulkOps.push({
                        updateOne: {
                            filter: { system_id: systemId },
                            update: updateOperation,
                            upsert: false,
                        },
                    });
                    updated++;
                }
            }

            // Execute all bulk operations in one go
            if (bulkOps.length > 0) {
                cliLogger.info(
                    `Executing bulk update for ${bulkOps.length} systems`
                );
                await SolarSystems.bulkWrite(bulkOps);
            }

            cliLogger.info(
                `System activity update completed. Processed: ${systems.length}, Updated: ${updated}`
            );
        } catch (error) {
            cliLogger.error(
                `Failed to update system activity: ${
                    error instanceof Error ? error.message : String(error)
                }`
            );
            throw error;
        }
    },
};
