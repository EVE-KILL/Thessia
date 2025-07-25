import { Stats } from "~/server/models/Stats";

export default defineCachedEventHandler(
    async (event) => {
        const typeParam = event.context.params?.type;
        const idParam = event.context.params?.id;

        if (!typeParam || !idParam) {
            throw createError({
                statusCode: 400,
                statusMessage: "Type and ID parameters are required",
            });
        }

        const id = Number.parseInt(idParam);
        if (isNaN(id)) {
            throw createError({
                statusCode: 400,
                statusMessage: "Invalid ID parameter",
            });
        }

        // Validate type parameter
        const validTypes = ["character", "corporation", "alliance"];
        if (!validTypes.includes(typeParam)) {
            throw createError({
                statusCode: 400,
                statusMessage:
                    "Invalid type parameter. Must be one of: character, corporation, alliance",
            });
        }

        // Map type to database field for Stats collection
        const typeFieldMap: Record<string, string> = {
            character: "character_id",
            corporation: "corporation_id",
            alliance: "alliance_id",
        };

        try {
            // Get stats from the pre-calculated Stats collection
            const stats = await Stats.findOne({
                type: typeFieldMap[typeParam],
                id: id,
                days: 0, // All-time stats
            })
                .select("full.monthlyStats")
                .lean();

            if (!stats || !stats.full || !stats.full.monthlyStats) {
                return {
                    monthlyStats: [],
                };
            }

            return {
                monthlyStats: stats.full.monthlyStats,
            };
        } catch (error) {
            console.error(
                `Error fetching monthly stats for ${typeParam} ${id}:`,
                error
            );
            throw createError({
                statusCode: 500,
                statusMessage: "Internal server error",
            });
        }
    },
    {
        maxAge: 3600, // Cache for 1 hour
        staleMaxAge: -1,
        swr: true,
        base: "redis",
        getKey: (event) => {
            const type = event.context.params?.type;
            const id = event.context.params?.id;
            return `stats:${type}:${id}:monthly`;
        },
        shouldBypassCache: (event) => {
            return process.env.NODE_ENV !== "production";
        },
    }
);
