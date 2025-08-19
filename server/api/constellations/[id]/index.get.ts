export default defineCachedEventHandler(
    async (event) => {
        const param = event.context.params?.id;

        if (!param) {
            throw createError({
                statusCode: 400,
                statusMessage: "Missing constellation identifier",
            });
        }

        let constellation;
        const numericId = Number(param);

        // Check if param is a string of digits
        if (!isNaN(numericId) && param.match(/^\d+$/)) {
            constellation = await Constellations.findOne(
                { constellation_id: numericId },
                { _id: 0, __v: 0 }
            );
            if (!constellation) {
                throw createError({
                    statusCode: 404,
                    statusMessage: `Constellation with ID ${numericId} not found`,
                });
            }
        } else {
            // Treat as a constellation name
            const decodedName = decodeURIComponent(param);
            // Perform a case-insensitive search for the name
            const nameRegex = new RegExp(`^${decodedName}$`, "i");
            constellation = await Constellations.findOne(
                { constellation_name: nameRegex },
                { _id: 0, __v: 0 }
            );
            if (!constellation) {
                throw createError({
                    statusCode: 404,
                    statusMessage: `Constellation with name "${decodedName}" not found`,
                });
            }
        }

        return constellation;
    },
    {
        maxAge: 86400, // Using a maxAge of 86400 seconds for constellation data
        staleMaxAge: -1,
        swr: true,
        base: "redis",
        getKey: (event) => {
            const param = event.context.params?.id;
            return `constellations:${param}:index`;
        },
    }
);
