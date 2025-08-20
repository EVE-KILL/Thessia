import { Celestials } from "../../../models/Celestials";
import { Constellations } from "../../../models/Constellations";
import { Factions } from "../../../models/Factions";
import { Regions } from "../../../models/Regions";
import { SolarSystems } from "../../../models/SolarSystems";
import { Sovereignty } from "../../../models/Sovereignty";

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
            system = await SolarSystems.findOne(
                { system_id: numericId },
                { _id: 0, __v: 0 }
            );
            if (!system) {
                throw createError({
                    statusCode: 404,
                    statusMessage: `Solar system with ID ${numericId} not found`,
                });
            }
        } else {
            // Treat as a system name
            const decodedName = decodeURIComponent(param);
            // Perform a case-insensitive search for the system name
            const nameRegex = new RegExp(`^${decodedName}$`, "i");
            system = await SolarSystems.findOne(
                { system_name: nameRegex },
                { _id: 0, __v: 0 }
            );
            if (!system) {
                throw createError({
                    statusCode: 404,
                    statusMessage: `Solar system with name "${decodedName}" not found`,
                });
            }
        }

        // Enrich system data with constellation and region information
        const enrichedSystem: any = { ...system.toObject() };

        // Get constellation information
        if (system.constellation_id) {
            const constellation = await Constellations.findOne(
                { constellation_id: system.constellation_id },
                { constellation_name: 1, region_id: 1, faction_id: 1, _id: 0 }
            ).lean();
            if (constellation) {
                enrichedSystem.constellation_name =
                    constellation.constellation_name;
            }
        }

        // Get region information
        if (system.region_id) {
            const region = await Regions.findOne(
                { region_id: system.region_id },
                { name: 1, faction_id: 1, _id: 0 }
            ).lean();
            if (region) {
                enrichedSystem.region_name = region.name;
                enrichedSystem.region_faction_id = region.faction_id;
            }
        }

        // Get faction information for system
        if (system.faction_id) {
            const faction = await Factions.findOne(
                { faction_id: system.faction_id },
                { name: 1, _id: 0 }
            ).lean();
            if (faction) {
                enrichedSystem.faction_name = faction.name;
            }
        }

        // Get celestials in the system
        const celestials = await Celestials.find(
            { solar_system_id: system.system_id },
            {
                item_id: 1,
                item_name: 1,
                type_id: 1,
                type_name: 1,
                x: 1,
                y: 1,
                z: 1,
                _id: 0,
            }
        ).lean();

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
                const destinationSystem = await SolarSystems.findOne(
                    { system_name: destinationSystemName },
                    {
                        system_id: 1,
                        system_name: 1,
                        region_id: 1,
                        constellation_id: 1,
                        _id: 0,
                    }
                );

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
        const neighboringSystems = await SolarSystems.find(
            {
                constellation_id: system.constellation_id,
                system_id: { $ne: system.system_id }, // Exclude current system
            },
            { system_id: 1, system_name: 1, security: 1, _id: 0 }
        ).lean();

        enrichedSystem.neighboring_systems = neighboringSystems;

        // Fetch system data to add sovereignty and activity information
        try {
            let systemSovereignty = null;
            let systemJumps = null;
            let systemKills = null;

            // Get sovereignty from our database
            const sovereigntyDoc = await Sovereignty.findOne(
                { system_id: system.system_id },
                { _id: 0, __v: 0, history: 0 } // Exclude unnecessary fields
            ).lean();

            if (sovereigntyDoc) {
                systemSovereignty = {
                    system_id: sovereigntyDoc.system_id,
                    alliance_id: sovereigntyDoc.alliance_id,
                    alliance_name: sovereigntyDoc.alliance_name,
                    corporation_id: sovereigntyDoc.corporation_id,
                    corporation_name: sovereigntyDoc.corporation_name,
                    faction_id: sovereigntyDoc.faction_id,
                };
            }

            // Get activity data from system document (this already exists in SolarSystems collection)
            if (system.jumps_24h && system.jumps_24h.length > 0) {
                // Get latest entry (1h data) and 24h cumulative
                const latestJump = system.jumps_24h[system.jumps_24h.length - 1];
                
                // Calculate 24h cumulative by summing all entries from last 24 hours
                const now = new Date();
                const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
                
                const jumps24h = system.jumps_24h
                    .filter(entry => new Date(entry.timestamp) >= twentyFourHoursAgo)
                    .reduce((sum, entry) => sum + (entry.ship_jumps || 0), 0);

                systemJumps = {
                    system_id: system.system_id,
                    ship_jumps_1h: latestJump.ship_jumps || 0,
                    ship_jumps: jumps24h,
                };
            } else {
                systemJumps = {
                    system_id: system.system_id,
                    ship_jumps_1h: 0,
                    ship_jumps: 0,
                };
            }

            if (system.kills_24h && system.kills_24h.length > 0) {
                // Get latest entry (1h data) and 24h cumulative
                const latestKill = system.kills_24h[system.kills_24h.length - 1];
                
                // Calculate 24h cumulative by summing all entries from last 24 hours
                const now = new Date();
                const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
                
                const kills24h = system.kills_24h.filter(entry => new Date(entry.timestamp) >= twentyFourHoursAgo);
                
                const shipKills24h = kills24h.reduce((sum, entry) => sum + (entry.ship_kills || 0), 0);
                const npcKills24h = kills24h.reduce((sum, entry) => sum + (entry.npc_kills || 0), 0);
                const podKills24h = kills24h.reduce((sum, entry) => sum + (entry.pod_kills || 0), 0);

                systemKills = {
                    system_id: system.system_id,
                    ship_kills_1h: latestKill.ship_kills || 0,
                    npc_kills_1h: latestKill.npc_kills || 0,
                    pod_kills_1h: latestKill.pod_kills || 0,
                    ship_kills: shipKills24h,
                    npc_kills: npcKills24h,
                    pod_kills: podKills24h,
                };
            } else {
                systemKills = {
                    system_id: system.system_id,
                    ship_kills_1h: 0,
                    npc_kills_1h: 0,
                    pod_kills_1h: 0,
                    ship_kills: 0,
                    npc_kills: 0,
                    pod_kills: 0,
                };
            }

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
