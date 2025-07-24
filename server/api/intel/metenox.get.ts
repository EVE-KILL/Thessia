import { Killmails } from "../../models/Killmails";
import { Celestials } from "../../models/Celestials";
import type { IKillmail } from "../../interfaces/IKillmail";
import type { ICelestial } from "../../interfaces/ICelestial";

interface IMetenoxMoonResult {
  system_id: number;
  system_name: string;
  region_id: number;
  region_name: string;
  moon_name: string;
  moon_id: number;
  killmail_id: number;
  moonType: Record<string, number>;
  items: any[];
}

/**
 * Get Metenox moon locations based on killmails
 * @param event - The Nitro event
 * @returns Array of Metenox moon locations with classification
 */
export default defineCachedEventHandler(async (event) => {
  try {
    // @ts-ignore - Type compatibility issue with nitro/h3 versions
    const query = getQuery(event);
    const systemId = query.system_id ? parseInt(query.system_id as string) : null;
    const regionId = query.region_id ? parseInt(query.region_id as string) : null;

    // Metenox Refinery ID
    const METENOX_ID = 81826;

    // Build killmail query
    const killmailQuery: any = {
      "victim.ship_id": METENOX_ID,
    };

    if (systemId) {
      killmailQuery.system_id = systemId;
    } else if (regionId) {
      killmailQuery.region_id = regionId;
    }

    // Find killmails with Metenox as victim using aggregation
    const killmails = await Killmails.aggregate([
      {
        $match: killmailQuery,
      },
      {
        $project: {
          killmail_id: 1,
          system_id: 1,
          region_id: 1,
          x: 1,
          y: 1,
          z: 1,
          items: 1,
          _id: 0,
        },
      },
    ]);

    const results: IMetenoxMoonResult[] = [];

    // Process each killmail to find the nearest moon
    for (const killmail of killmails) {
      // Skip if coordinates are missing
      if (!killmail.x || !killmail.y || !killmail.z) {
        continue;
      }

      // Distance limit: 1000 AU in meters (1 AU ≈ 1.496×10^11 meters, but using the original value)
      const distance = 1000 * 3.086e16;

      // Find the closest celestial using aggregation
      const celestialResult = await Celestials.aggregate([
        {
          $match: {
            solar_system_id: killmail.system_id,
            x: {
              $gt: killmail.x - distance,
              $lt: killmail.x + distance,
            },
            y: {
              $gt: killmail.y - distance,
              $lt: killmail.y + distance,
            },
            z: {
              $gt: killmail.z - distance,
              $lt: killmail.z + distance,
            },
          },
        },
        {
          $project: {
            item_id: 1,
            item_name: 1,
            constellation_id: 1,
            solar_system_id: 1,
            solar_system_name: 1,
            region_id: 1,
            region_name: 1,
            distance: {
              $sqrt: {
                $add: [
                  { $pow: [{ $subtract: ["$x", killmail.x] }, 2] },
                  { $pow: [{ $subtract: ["$y", killmail.y] }, 2] },
                  { $pow: [{ $subtract: ["$z", killmail.z] }, 2] },
                ],
              },
            },
          },
        },
        { $sort: { distance: 1 } },
        { $limit: 1 },
      ]);

      if (celestialResult.length > 0) {
        const celestial = celestialResult[0];
        
        results.push({
          system_id: celestial.solar_system_id,
          system_name: celestial.solar_system_name,
          region_id: celestial.region_id,
          region_name: celestial.region_name,
          moon_name: celestial.item_name,
          moon_id: celestial.item_id,
          killmail_id: killmail.killmail_id,
          moonType: classifyGoos(killmail),
          items: killmail.items || [],
        });
      }
    }

    return results;
  } catch (error) {
    console.error("Error in metenox endpoint:", error);
    throw createError({
      statusCode: 500,
      statusMessage: "Internal Server Error",
    });
  }
}, {
  maxAge: 3600, // Cache for 1 hour
  staleMaxAge: -1,
  swr: true,
  base: "redis",
  shouldBypassCache: (event) => {
    return process.env.NODE_ENV !== "production";
  },
  getKey: (event) => {
    // @ts-ignore - Type compatibility issue with nitro/h3 versions
    const query = getQuery(event);
    const systemId = query.system_id || "all";
    const regionId = query.region_id || "all";
    return `intel:metenox:system_${systemId}:region_${regionId}`;
  },
});

/**
 * Classify moon goo types based on killmail items
 * @param killmail - The killmail to analyze
 * @returns Object with goo type counts
 */
function classifyGoos(killmail: any): Record<string, number> {
  const gooTypes = {
    R4: [
      "Hydrocarbons",
      "Silicates", 
      "Evaporite Deposits",
      "Atmospheric Gases",
    ],
    R8: [
      "Cobalt",
      "Scandium",
      "Tungsten", 
      "Titanium",
    ],
    R16: [
      "Chromium",
      "Cadmium",
      "Platinum",
      "Vanadium",
    ],
    R32: [
      "Technetium",
      "Mercury",
      "Caesium",
      "Hafnium",
    ],
    R64: [
      "Promethium",
      "Neodymium",
      "Dysprosium",
      "Thulium",
    ],
  };

  const result: Record<string, number> = {};

  // Loop through the items in the killmail and classify them
  if (killmail.items && Array.isArray(killmail.items)) {
    for (const item of killmail.items) {
      // Check if the item name matches any goo type
      // Note: We need to check the name property, which might be a translation object
      const itemName = typeof item.name === 'string' ? item.name : item.name?.en || '';
      
      for (const [type, names] of Object.entries(gooTypes)) {
        if (names.includes(itemName)) {
          result[type] = (result[type] || 0) + 1;
        }
      }
    }
  }

  return result;
}
