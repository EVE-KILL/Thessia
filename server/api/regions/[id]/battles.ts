import type { PipelineStage } from "mongoose";

export default defineCachedEventHandler(
    async (event) => {
        const query = getQuery(event as any);
        const idParam = event.context.params?.id;
        const regionId = idParam ? parseInt(idParam.toString(), 10) : NaN;
        if (!regionId) {
            throw createError({
                statusCode: 400,
                statusMessage: "Invalid region id",
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
                $match: { region_id: regionId },
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
                Battles.countDocuments({ region_id: regionId }),
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
            console.error("Error fetching region battles:", error);
            throw createError({
                statusCode: 500,
                statusMessage: "Internal Server Error fetching region battles",
            });
        }
    },
    {
        maxAge: 86400,
        staleMaxAge: -1,
        swr: true,
        getKey: (event) => {
            const regionId = event.context.params?.id;
            if (!regionId) {
                throw createError({
                    statusCode: 400,
                    statusMessage: "Invalid region id for cache key",
                });
            }
            const query = getQuery(event as any);
            const page = query?.page ? query.page.toString() : "1";
            return `regions:${regionId}:battles:page:${page}`;
        },
    }
);
