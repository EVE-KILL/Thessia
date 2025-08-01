export default defineCachedEventHandler(
    async (event) => {
        const param = event.context.params?.id;

        if (!param) {
            throw createError({
                statusCode: 400,
                statusMessage: "Missing region identifier",
            });
        }

        let region;
        const numericId = Number(param);

        // Check if param is a string of digits
        if (!isNaN(numericId) && param.match(/^\d+$/)) {
            region = await Regions.findOne(
                { region_id: numericId },
                { _id: 0, __v: 0 }
            );
            if (!region) {
                throw createError({
                    statusCode: 404,
                    statusMessage: `Region with ID ${numericId} not found`,
                });
            }
        } else {
            // Treat as a region name
            const decodedName = decodeURIComponent(param);
            // Perform a case-insensitive search for the name
            const nameRegex = new RegExp(`^${decodedName}$`, "i");
            region = await Regions.findOne(
                { "name.en": nameRegex },
                { _id: 0, __v: 0 }
            );
            if (!region) {
                throw createError({
                    statusCode: 404,
                    statusMessage: `Region with name "${decodedName}" not found`,
                });
            }
        }

        return region;
    },
    {
        maxAge: 86400,
        staleMaxAge: -1,
        swr: true,
        base: "redis",
        shouldBypassCache: (event) => {
            return process.env.NODE_ENV !== "production";
        },
        getKey: (event) => {
            const param = event.context.params?.id;
            return `regions:id:${param}`;
        },
    }
);
