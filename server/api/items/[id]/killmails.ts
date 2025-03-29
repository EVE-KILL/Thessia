import { InvTypes } from "~/server/models/InvTypes";
import { Killmails } from "~/server/models/Killmails";

/**
 * List of ship group IDs to identify ships vs. modules/items
 */
const shipGroupIds = [
  25, 26, 27, 28, 29, 30, 31, 237, 324, 358, 380, 381, 419, 420, 463, 485, 513, 540, 541, 543, 547,
  659, 830, 831, 832, 833, 834, 883, 893, 894, 898, 900, 902, 906, 941, 963, 1022, 1201, 1202, 1283,
  1305, 1527, 1534, 1538, 1972, 2001, 4594,
];

/**
 * Get killmails involving a specific item type (either as a destroyed ship or fitted module)
 * Returns a simple array of killmail data without pagination
 */
export default defineCachedEventHandler(
  async (event) => {
    try {
      const query = getQuery(event);
      const typeId: number | null = event.context.params?.id
        ? Number.parseInt(event.context.params.id)
        : null;

      if (!typeId || Number.isNaN(typeId)) {
        throw createError({
          statusCode: 400,
          statusMessage: "Valid Type ID is required",
        });
      }

      // Parse limit parameter with default of 10 and max of 100
      const limit = Math.min(Math.max(Number.parseInt((query.limit as string) || "10"), 1), 100);

      // Get item type information to determine if it's a ship
      const type = await InvTypes.findOne({ type_id: typeId }, { group_id: 1 }).lean();
      if (!type) {
        throw createError({
          statusCode: 404,
          statusMessage: "Item type not found",
        });
      }

      const typeGroupId = type.group_id;

      // Define the query condition and index hint based on whether the item is a ship
      let queryCondition = {};
      let indexHint = {};

      if (typeGroupId && shipGroupIds.includes(typeGroupId)) {
        // If it's a ship, search for victim.ship_id
        queryCondition = { "victim.ship_id": typeId };
        indexHint = { "victim.ship_id": -1, kill_time: -1 };
      } else {
        // For non-ship items, search for items.type_id
        queryCondition = { "items.type_id": typeId };
        indexHint = { "items.type_id": -1, kill_time: -1 };
      }

      // Run query with projection to minimize data transfer
      const killmails = await Killmails.find(
        queryCondition,
        {
          _id: 0,
          killmail_id: 1,
          kill_time: 1,
          total_value: 1,
          "victim.ship_id": 1,
          "victim.ship_name": 1,
          "victim.character_id": 1,
          "victim.character_name": 1,
          "victim.corporation_id": 1,
          "victim.corporation_name": 1,
          "victim.alliance_id": 1,
          "victim.alliance_name": 1,
        },
        {
          limit: limit,
          sort: { kill_time: -1 }, // Sort by kill time descending for most recent first
        },
      )
        .hint(indexHint)
        .lean();

      // Return directly mapped results without pagination wrapping
      return killmails.map((killmail) => ({
        killmail_id: killmail.killmail_id,
        kill_time: killmail.kill_time,
        total_value: killmail.total_value,
        victim: {
          ship_id: killmail.victim.ship_id,
          ship_name: killmail.victim.ship_name,
          character_id: killmail.victim.character_id,
          character_name: killmail.victim.character_name,
          corporation_id: killmail.victim.corporation_id,
          corporation_name: killmail.victim.corporation_name,
          alliance_id: killmail.victim.alliance_id,
          alliance_name: killmail.victim.alliance_name,
        },
      }));
    } catch (error) {
      if (error.statusCode) {
        throw error;
      }

      console.error(`Error fetching item killmails: ${error.message}`);
      throw createError({
        statusCode: 500,
        statusMessage: "Error retrieving killmails for this item",
      });
    }
  },
  {
    // Cache for 15 minutes
    maxAge: 15 * 60,
    getKey: (event) =>
      `${event.path}?${new URLSearchParams(getQuery(event) as Record<string, string>).toString()}`,
    tags: ["item", "killmail"],
  },
);
