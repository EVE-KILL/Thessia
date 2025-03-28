import { Killmails } from "~/server/models/Killmails";
import type { IKillmail } from "~/server/interfaces/IKillmail";

/**
 * Get a single killmail by ID
 * Cache the response for 1 hour since killmails are immutable once processed
 */
export default defineCachedEventHandler(
  async (event) => {
    try {
      const killmail_id = event.context.params?.id;

      if (!killmail_id || isNaN(Number(killmail_id))) {
        throw createError({
          statusCode: 400,
          statusMessage: "Invalid killmail ID format"
        });
      }

      // Get projection parameter to allow fetching only specific fields
      const query = getQuery(event);
      const fields = query.fields as string | undefined;

      // Build projection object
      const projection: Record<string, number> = { _id: 0 };
      if (fields) {
        // If fields parameter exists, add requested fields to projection
        fields.split(',').forEach(field => {
          projection[field.trim()] = 1;
        });
      }

      const killmail: IKillmail | null = await Killmails.findOne(
        { killmail_id: Number(killmail_id) },
        projection,
        { hint: "killmail_id_-1_killmail_hash_-1" },
      ).lean();

      if (!killmail) {
        throw createError({
          statusCode: 404,
          statusMessage: "Killmail not found"
        });
      }

      return killmail;
    } catch (error) {
      if (error.statusCode) {
        throw error;
      }

      console.error(`Error fetching killmail: ${error.message}`);
      throw createError({
        statusCode: 500,
        statusMessage: "Error retrieving killmail"
      });
    }
  },
  {
    // Cache for 1 hour (killmails are immutable once processed)
    maxAge: 60 * 60,
    // Use query params and route params as cache key parts
    getKey: (event) => `${event.path}${event.context.params?.id}${JSON.stringify(getQuery(event))}`,
    // Add cache tags for invalidation if needed
    tags: ["killmail"]
  }
);
