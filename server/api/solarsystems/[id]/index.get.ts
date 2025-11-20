import prisma from "~/lib/prisma";
import { FactionService, SystemService } from "../../../services";

export default defineCachedEventHandler(
    async (event) => {
        const param = event.context.params?.id;

        if (!param) {
            throw createError({
                statusCode: 400,
                statusMessage: "Missing system identifier",
            });
        }

        let system;
        const numericId = Number(param);

        if (!isNaN(numericId) && param.match(/^\d+$/)) {
            // Check if it's a valid number (integer)
            system = await SystemService.findById(numericId);
            if (!system) {
                throw createError({
                    statusCode: 404,
                    statusMessage: `Solar system with ID ${numericId} not found`,
                });
            }
        } else {
            // Treat as a system name
            const decodedName = decodeURIComponent(param);
            // Search by name pattern
            const systems = await SystemService.searchByName(decodedName, 10);
            system = systems.find(
                (s) =>
                    s.system_name?.toLowerCase() === decodedName.toLowerCase()
            );
            if (!system) {
                throw createError({
                    statusCode: 404,
                    statusMessage: `Solar system with name "${decodedName}" not found`,
                });
            }
        }

        // Get system with full hierarchy (region, constellation)
        const systemWithHierarchy = await SystemService.getWithHierarchy(
            system.system_id
        );
        if (!systemWithHierarchy) {
            throw createError({
                statusCode: 404,
                statusMessage: "System hierarchy data not found",
            });
        }

        // Create enriched system object
        const enrichedSystem: any = {
            ...system,
            constellation_name:
                systemWithHierarchy.constellation?.constellation_name,
            region_name:
                systemWithHierarchy.constellation?.region?.region_name,
            region_faction_id:
                systemWithHierarchy.constellation?.region?.faction_id,
        };

        // Get faction information for system
        if (system.faction_id) {
            const faction = await FactionService.findById(system.faction_id);
            if (faction) {
                enrichedSystem.faction_name = faction.name;
            }
        }

        // Get celestials in the system
        const celestials = await prisma.celestial.findMany({
            where: { solar_system_id: system.system_id },
            select: {
                item_id: true,
                item_name: true,
                type_id: true,
                type_name: true,
                x: true,
                y: true,
                z: true,
            },
        });

        enrichedSystem.celestials = celestials;

        // Find regional jump connections by looking for stargates
        const stargates = celestials.filter(
            (celestial) =>
                celestial.type_name === "Stargate" ||
                celestial.item_name?.includes("Stargate")
        );

        // For each stargate, try to find where it leads to
        const jumpConnections = [];
        for (const stargate of stargates) {
            // Extract destination system name from stargate name
            // Stargate names typically follow pattern "Stargate (System Name)"
            const match = stargate.item_name?.match(/Stargate \(([^)]+)\)/);
            if (match) {
                const destinationSystemName = match[1];
                const destinationSystem = await prisma.solarSystem.findFirst({
                    where: { system_name: destinationSystemName },
                    select: {
                        system_id: true,
                        system_name: true,
                        region_id: true,
                        constellation_id: true,
                    },
                });

                if (destinationSystem) {
                    // Check if this is a regional jump (different region)
                    const isRegionalJump =
                        destinationSystem.region_id !== system.region_id;

                    jumpConnections.push({
                        stargate_id: stargate.item_id,
                        stargate_name: stargate.item_name,
                        destination_system_id: destinationSystem.system_id,
                        destination_system_name: destinationSystem.system_name,
                        destination_region_id: destinationSystem.region_id,
                        destination_constellation_id:
                            destinationSystem.constellation_id,
                        is_regional_jump: isRegionalJump,
                    });
                }
            }
        }

        enrichedSystem.jump_connections = jumpConnections;

        // Add neighboring systems (same constellation)
        const neighboringSystems = await prisma.solarSystem.findMany({
            where: {
                constellation_id: system.constellation_id,
                system_id: { not: system.system_id },
            },
            select: { system_id: true, system_name: true, security: true },
        });

        enrichedSystem.neighboring_systems = neighboringSystems;

        // Fetch system data to add sovereignty and activity information
        try {
            let systemSovereignty = null;
            let systemJumps = null;
            let systemKills = null;

            // Get sovereignty from our database
            const sovereigntyDoc = await prisma.sovereignty.findUnique({
                where: { system_id: system.system_id },
                include: {
                    alliance: { select: { name: true } },
                    corporation: { select: { name: true } },
                },
            });

            if (sovereigntyDoc) {
                systemSovereignty = {
                    system_id: sovereigntyDoc.system_id,
                    alliance_id: sovereigntyDoc.alliance_id,
                    alliance_name: sovereigntyDoc.alliance?.name,
                    corporation_id: sovereigntyDoc.corporation_id,
                    corporation_name: sovereigntyDoc.corporation?.name,
                    faction_id: sovereigntyDoc.faction_id,
                    faction_name: undefined as string | undefined,
                };

                // Get faction name if faction_id exists
                if (sovereigntyDoc.faction_id) {
                    const sovereigntyFaction = await FactionService.findById(
                        sovereigntyDoc.faction_id
                    );
                    if (sovereigntyFaction) {
                        systemSovereignty.faction_name =
                            sovereigntyFaction.name;
                    }
                }
            }

            const activityData: any = systemWithHierarchy.activity || {};

            systemJumps = {
                system_id: system.system_id,
                ship_jumps_1h: activityData.ship_jumps_1h || 0,
                ship_jumps:
                    activityData.ship_jumps ??
                    activityData.jumps_24h ??
                    activityData.total_ship_jumps ??
                    0,
            };

            const killsData: any = systemWithHierarchy.kills || {};
            systemKills = {
                system_id: system.system_id,
                ship_kills_1h: killsData.ship_kills_1h || 0,
                npc_kills_1h: killsData.npc_kills_1h || 0,
                pod_kills_1h: killsData.pod_kills_1h || 0,
                ship_kills:
                    killsData.ship_kills ??
                    killsData.total_ship_kills ??
                    killsData.kills_24h ??
                    0,
                npc_kills:
                    killsData.npc_kills ??
                    killsData.total_npc_kills ??
                    killsData.npc_kills_24h ??
                    0,
                pod_kills:
                    killsData.pod_kills ??
                    killsData.total_pod_kills ??
                    killsData.pod_kills_24h ??
                    0,
            };

            enrichedSystem.sovereignty = systemSovereignty;
            enrichedSystem.jumps = systemJumps;
            enrichedSystem.kills = systemKills;
        } catch (error) {
            console.warn("Failed to fetch system data:", error);
            // Set fallback values
            enrichedSystem.sovereignty = null;
            enrichedSystem.jumps = null;
            enrichedSystem.kills = null;
        }

        return enrichedSystem;
    },
    {
        maxAge: 3600, // Reduced to 1 hour since we're now pulling dynamic celestial data
        staleMaxAge: -1,
        swr: true,
        base: "redis",
        getKey: (event) => {
            const param = event.context.params?.id;
            return `solarsystems:${param}:enriched`;
        },
    }
);
