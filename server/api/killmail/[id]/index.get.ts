import { KillmailService } from "~/server/services";

/**
 * Get a single killmail by ID
 * Cache the response for 1 hour since killmails are immutable once processed
 */
export default defineCachedEventHandler(
    async (event) => {
        try {
            const killmail_id = event.context.params?.id;

            if (!killmail_id || Number.isNaN(Number(killmail_id))) {
                throw createError({
                    statusCode: 400,
                    statusMessage: "Invalid killmail ID format",
                });
            }

            // Get projection parameter to allow fetching only specific fields
            const query = getQuery(event);
            const fields = query.fields as string | undefined;

            // Build projection object
            const projection: Record<string, number> = { _id: 0 };
            if (fields) {
                // If fields parameter exists, add requested fields to projection
                fields.split(",").forEach((field) => {
                    projection[field.trim()] = 1;
                });
            }

            const killmail = await KillmailService.findByIdWithFull(
                Number(killmail_id)
            );

            if (!killmail) {
                throw createError({
                    statusCode: 404,
                    statusMessage: "Killmail not found",
                });
            }

            const serialized = JSON.parse(JSON.stringify(killmail));

            if (fields) {
                const filtered: Record<string, any> = {};
                fields.split(",").forEach((field) => {
                    const key = field.trim();
                    if (key && key in serialized) {
                        filtered[key] = serialized[key];
                    }
                });
                return filtered;
            }

            return serialized;
        } catch (error: any) {
            if (error.statusCode) {
                throw error;
            }

            console.error(`Error fetching killmail: ${error.message}`);
            throw createError({
                statusCode: 500,
                statusMessage: "Error retrieving killmail",
            });
        }
    },
    {
        maxAge: 3600,
        staleMaxAge: -1,
        swr: true,
        base: "redis",
        getKey: (event) => {
            const idParam = event.context.params?.id;
            const query = getQuery(event);
            const fields = query.fields as string | undefined;
            return `killmail:${idParam}:fields:${fields || "all"}`;
        },
        shouldBypassCache: async (event) => {
            try {
                const killmail_id = event.context.params?.id;

                if (!killmail_id || Number.isNaN(Number(killmail_id))) {
                    // Invalid ID format - bypass cache to let the error handler deal with it
                    return true;
                }

                // Quick check to see if killmail exists in database
                // Only select _id field for performance
            const killmail = await KillmailService.findById(
                Number(killmail_id)
            );

                // Bypass cache if killmail doesn't exist
                // This prevents caching 404 responses for killmails that might be processed soon
                return !killmail;
            } catch (error) {
                // If there's any error checking the database, bypass cache to be safe
                return true;
            }
        },
    }
);
