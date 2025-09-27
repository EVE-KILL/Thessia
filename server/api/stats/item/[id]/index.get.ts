import { KillmailService, TypeService } from "~/server/services";

/**
 * Optimized Item Statistics API
 * Provides only the essential statistics actually used by the frontend:
 * - Recent kills count (7 days)
 * - All-time kills count (ships only)
 *
 * PERFORMANCE OPTIMIZATION:
 * - Removed unused facet aggregations (daily activity, regional distribution, etc.)
 * - Only calculates data that's actually displayed in the UI
 * - Much faster execution with simple count queries
 */
export default defineCachedEventHandler(
    async (event) => {
        try {
            const typeId: number | null = event.context.params?.id
                ? Number.parseInt(event.context.params.id)
                : null;

            if (!typeId || Number.isNaN(typeId)) {
                throw createError({
                    statusCode: 400,
                    statusMessage: "Valid Type ID is required",
                });
            }

            // Define ship group IDs for determining if this is a ship
            const shipGroupIds = [
                25, 26, 27, 28, 29, 30, 31, 237, 324, 358, 380, 381, 419, 420,
                463, 485, 513, 540, 541, 543, 547, 659, 830, 831, 832, 833, 834,
                883, 893, 894, 898, 900, 902, 906, 941, 963, 1022, 1201, 1202,
                1283, 1305, 1527, 1534, 1538, 1972, 2001, 4594,
            ];

            // Get item details to determine if it's a ship
            const item = await TypeService.findById(typeId);

            if (!item) {
                throw createError({
                    statusCode: 404,
                    statusMessage: "Item not found",
                });
            }

            const isShip = Boolean(
                item.group_id && shipGroupIds.includes(item.group_id)
            );
            const dateThreshold = new Date(
                Date.now() - 7 * 24 * 60 * 60 * 1000
            ); // 7 days

            // Execute only the essential queries
            const [recentKillsCount, allTimeKillsCount] = await Promise.all([
                // Recent kills count (last 7 days)
                KillmailService.countByTypeId(typeId, isShip, dateThreshold),

                // All-time kills count - only for ships to avoid expensive queries
                isShip
                    ? KillmailService.countByTypeId(typeId, isShip)
                    : Promise.resolve(null),
            ]);

            // Build minimal response with only essential data
            const stats = {
                typeId,
                isShip,
                summary: {
                    recentKills: recentKillsCount,
                    allTimeKills: allTimeKillsCount,
                },
                meta: {
                    generatedAt: new Date().toISOString(),
                    itemName: (item.name as any)?.en || "Unknown Item",
                },
            };

            return stats;
        } catch (error: any) {
            if (error.statusCode) {
                throw error;
            }

            console.error(`Error fetching item stats: ${error.message}`);
            throw createError({
                statusCode: 500,
                statusMessage: "Error retrieving item statistics",
            });
        }
    },
    {
        // Cache for 30 minutes
        maxAge: 30 * 60,
        getKey: (event) => {
            return `item-stats-optimized-${event.context.params?.id}`;
        },
    }
);
