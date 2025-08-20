import {
    getAlliance,
    getCorporation,
    getSovereigntyMap,
    getSystemJumps,
    getSystemKills,
} from "../../../helpers/ESIData";
import { Celestials } from "../../../models/Celestials";
import { Constellations } from "../../../models/Constellations";
import { Factions } from "../../../models/Factions";
import { Regions } from "../../../models/Regions";
import { SolarSystems } from "../../../models/SolarSystems";

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

        // Fetch ESI data to add sovereignty and activity information
        try {
            // Fetch sovereignty data
            const sovereigntyData = await getSovereigntyMap();
            const systemSovereignty = sovereigntyData.find(
                (entry: any) => entry.system_id === system.system_id
            );
            enrichedSystem.sovereignty = systemSovereignty || null;

            // Resolve alliance and corporation names if we have IDs
            if (systemSovereignty?.alliance_id) {
                try {
                    const allianceData = await getAlliance(
                        systemSovereignty.alliance_id
                    );
                    enrichedSystem.sovereignty.alliance_name =
                        allianceData.name;
                } catch (error) {
                    console.warn("Failed to fetch alliance name:", error);
                }
            }

            if (systemSovereignty?.corporation_id) {
                try {
                    const corpData = await getCorporation(
                        systemSovereignty.corporation_id
                    );
                    enrichedSystem.sovereignty.corporation_name = corpData.name;
                } catch (error) {
                    console.warn("Failed to fetch corporation name:", error);
                }
            }

            // Fetch system activity data
            const jumpData = await getSystemJumps();
            const systemJumps = jumpData.find(
                (entry: any) => entry.system_id === system.system_id
            );
            enrichedSystem.jumps = systemJumps || null;

            const killData = await getSystemKills();
            const systemKills = killData.find(
                (entry: any) => entry.system_id === system.system_id
            );
            enrichedSystem.kills = systemKills || null;
        } catch (error) {
            console.warn("Failed to fetch ESI data:", error);
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
