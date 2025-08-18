export default defineCachedEventHandler(
    async (event) => {
        const param = event.context.params?.id;

        if (!param) {
            throw createError({
                statusCode: 400,
                statusMessage: "Missing system identifier",
            });
        }

        let system;
        const numericId = Number(param);

        if (!isNaN(numericId) && param.match(/^\d+$/)) {
            // Check if it's a valid number (integer)
            system = await SolarSystems.findOne(
                { system_id: numericId },
                { _id: 0, __v: 0 }
            );
            if (!system) {
                throw createError({
                    statusCode: 404,
                    statusMessage: `Solar system with ID ${numericId} not found`,
                });
            }
        } else {
            // Treat as a system name
            const decodedName = decodeURIComponent(param);
            // Perform a case-insensitive search for the system name
            const nameRegex = new RegExp(`^${decodedName}$`, "i");
            system = await SolarSystems.findOne(
                { system_name: nameRegex },
                { _id: 0, __v: 0 }
            );
            if (!system) {
                throw createError({
                    statusCode: 404,
                    statusMessage: `Solar system with name "${decodedName}" not found`,
                });
            }
        }

        return system;
    },
    {
        maxAge: 86400, // Using a maxAge of 86400 seconds for static solar system data
        staleMaxAge: -1,
        swr: true,
        getKey: (event) => {
            // Construct a unique key for this endpoint.
            // This file uses a dynamic parameter `[id]`, likely representing a solar system ID or name.
            // You MUST include this parameter in the cache key.
            const param = event.context.params?.id;
            // No query parameters are used in this handler, so the key only needs the dynamic parameter.
            return `solarsystems:${param}:index`;
        },
    }
);
