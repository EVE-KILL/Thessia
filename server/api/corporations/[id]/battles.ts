import type { PipelineStage } from "mongoose";

export default defineCachedEventHandler(
    async (event) => {
        const query = getQuery(event);
        const idParam = event.context.params?.id;
        const corporationId = idParam ? parseInt(idParam.toString(), 10) : NaN;
        if (isNaN(corporationId)) {
            throw createError({
                statusCode: 400,
                statusMessage: "Invalid corporation ID",
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
                $match: { corporationsInvolved: corporationId },
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
                Battles.countDocuments({ corporationsInvolved: corporationId }),
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
            console.error("Error fetching corporation battles:", error);
            throw createError({
                statusCode: 500,
                statusMessage:
                    "Internal Server Error fetching corporation battles",
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
            const page = query.page?.toString() || "1";
            const limit = query.limit?.toString() || "20";
            return `corporations:${idParam}:battles:page:${page}:limit:${limit}`;
        },
        shouldBypassCache: (event) => {
            return process.env.NODE_ENV !== "production";
        },
    }
);
