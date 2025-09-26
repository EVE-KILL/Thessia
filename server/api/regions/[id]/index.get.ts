import { RegionService } from "~/server/services";

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
            region = await RegionService.findById(numericId);
            if (!region) {
                throw createError({
                    statusCode: 404,
                    statusMessage: `Region with ID ${numericId} not found`,
                });
            }
        } else {
            // Treat as a region name
            const decodedName = decodeURIComponent(param);
            region = await RegionService.findByName(decodedName);
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
        getKey: (event) => {
            const param = event.context.params?.id;
            return `regions:id:${param}`;
        },
    }
);
