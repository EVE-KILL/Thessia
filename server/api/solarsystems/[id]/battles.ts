import type { PipelineStage } from "mongoose";

export default defineCachedEventHandler(
    async (event) => {
        const query = getQuery(event);
        const idParam = event.context.params?.id;
        // The idParam is guaranteed by the route to be digits.
        const systemId = idParam ? parseInt(idParam.toString(), 10) : NaN;
        if (isNaN(systemId)) {
            // This should not be reached if routing works correctly.
            throw createError({
                statusCode: 400,
                statusMessage: "Invalid system ID",
            });
        }

        const page = parseInt(query.page?.toString() || "1", 10);
        const limit = parseInt(query.limit?.toString() || "20", 10);
        if (isNaN(page) || page < 1) {
            throw createError({
                statusCode: 400,
                statusMessage: "Invalid page number",
            });
        }
        if (isNaN(limit) || limit < 1 || limit > 100) {
            throw createError({
                statusCode: 400,
                statusMessage:
                    "Invalid limit value (must be between 1 and 100)",
            });
        }
        const skip = (page - 1) * limit;

        try {
            const matchStage: PipelineStage = {
                $match: { system_id: systemId },
            };
            const pipeline: PipelineStage[] = [
                matchStage,
                { $sort: { start_time: -1 } },
                { $skip: skip },
                { $limit: limit },
                { $project: { _id: 0 } },
            ];

            const [results, totalItems] = await Promise.all([
                Battles.aggregate(pipeline),
                Battles.countDocuments({ system_id: systemId }),
            ]);

            const totalPages = Math.ceil(totalItems / limit);
            return {
                totalItems,
                totalPages,
                currentPage: page,
                itemsPerPage: limit,
                battles: results,
            };
        } catch (error) {
            console.error("Error fetching system battles:", error);
            throw createError({
                statusCode: 500,
                statusMessage: "Internal Server Error fetching system battles",
            });
        }
    },
    {
        maxAge: 86400, // Using a maxAge of 86400 seconds for static solar system data
        staleMaxAge: -1,
        swr: true,
        base: "redis",
        getKey: (event) => {
            const systemId = (event as any).context.params?.id;
            const query = getQuery(event as any);
            const page = query?.page ? query.page.toString() : "1";
            // Include systemId and page in the cache key
            return `solarsystems:${systemId}:battles:page:${page}`;
        },
    }
);
