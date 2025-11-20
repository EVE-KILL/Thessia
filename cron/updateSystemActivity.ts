import prisma from "../lib/prisma";
import { getSystemJumps, getSystemKills } from "../server/helpers/ESIData";
import { cliLogger } from "../server/helpers/Logger";

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

            // Get all systems
            const systems = await prisma.solarSystem.findMany({
                select: {
                    system_id: true,
                    activity: true,
                    kills: true
                }
            });

            cliLogger.info(`Processing ${systems.length} systems`);

            let updated = 0;

            for (const system of systems) {
                const systemId = system.system_id;
                let needsUpdate = false;

                // Parse existing data
                // Cast to any[] because Prisma Json type is loosely typed in TS as JsonValue
                let activityArr: any[] = Array.isArray(system.activity) ? system.activity as any[] : [];
                let killsArr: any[] = Array.isArray(system.kills) ? system.kills as any[] : [];

                // Process jumps data
                const jumpEntry = jumpsData.find(
                    (entry: any) => entry.system_id === systemId
                );

                if (jumpEntry) {
                    // Filter old
                    activityArr = activityArr.filter(
                        (entry: any) => new Date(entry.timestamp) > oneDayAgo
                    );
                    // Add new
                    activityArr.push({
                        timestamp: now.toISOString(),
                        ship_jumps: jumpEntry.ship_jumps || 0,
                    });
                    needsUpdate = true;
                } else if (activityArr.length > 0) {
                     // Cleanup old entries
                     const len = activityArr.length;
                     activityArr = activityArr.filter((e: any) => new Date(e.timestamp) > oneDayAgo);
                     if (activityArr.length !== len) needsUpdate = true;
                }

                // Process kills data
                const killEntry = killsData.find(
                    (entry: any) => entry.system_id === systemId
                );

                if (killEntry) {
                    killsArr = killsArr.filter(
                        (entry: any) => new Date(entry.timestamp) > oneDayAgo
                    );
                    killsArr.push({
                        timestamp: now.toISOString(),
                        ship_kills: killEntry.ship_kills || 0,
                        npc_kills: killEntry.npc_kills || 0,
                        pod_kills: killEntry.pod_kills || 0,
                    });
                    needsUpdate = true;
                } else if (killsArr.length > 0) {
                    const len = killsArr.length;
                    killsArr = killsArr.filter((e: any) => new Date(e.timestamp) > oneDayAgo);
                    if (killsArr.length !== len) needsUpdate = true;
                }

                if (needsUpdate) {
                    await prisma.solarSystem.update({
                        where: { system_id: systemId },
                        data: {
                            activity: activityArr,
                            kills: killsArr
                        }
                    });
                    updated++;
                }
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
