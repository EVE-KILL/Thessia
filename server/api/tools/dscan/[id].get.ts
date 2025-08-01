export default defineCachedEventHandler(
    async (event: any) => {
        // Cast event to any
        try {
            const id = getRouterParam(event, "id");

            if (!id) {
                throw createError({
                    statusCode: 400,
                    message: "Missing ID parameter",
                });
            }

            const data = await DScan.findOne(
                { hash: id },
                {
                    _id: 0,
                    hash: 0,
                    createdAt: 0,
                    updatedAt: 0,
                    __v: 0,
                }
            ).lean();

            if (!data) {
                throw createError({
                    statusCode: 404,
                    message: "No data found for this ID",
                });
            }

            return data;
        } catch (error: any) {
            console.error("Error fetching DScan:", error);
            throw createError({
                statusCode: error.statusCode || 500,
                message: error.message || "Failed to retrieve DScan data",
            });
        }
    },
    {
        maxAge: 86400,
        staleMaxAge: -1,
        swr: true,
        base: "redis",
        shouldBypassCache: (event: any) => {
            // Cast event to any
            return process.env.NODE_ENV !== "production";
        },
        getKey: (event: any) => {
            // Cast event to any
            const dscanId = getRouterParam(event, "id");
            return `tools:dscan:${dscanId}:index`;
        },
    }
);
