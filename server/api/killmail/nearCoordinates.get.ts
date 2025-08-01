interface NearCoordinatesResult {
    killmail_id: number;
    distance: number;
    kill_time: Date;
    total_value: number;
    victim: {
        ship_id: number;
        ship_name: { [key: string]: string };
    };
}

/**
 * Find killmails near specific 3D coordinates in a solar system
 * This is computationally expensive, so results are cached for a short period
 */
export default defineCachedEventHandler(
    async (event) => {
        try {
            const query = getQuery(event);

            // Validate required parameters
            const requiredParams = [
                "system_id",
                "x",
                "y",
                "z",
                "distanceInMeters",
            ];
            const missingParams = requiredParams.filter(
                (param) => !query[param]
            );
            if (missingParams.length > 0) {
                throw createError({
                    statusCode: 400,
                    statusMessage: `Missing required parameters: ${missingParams.join(
                        ", "
                    )}`,
                });
            }

            // Parse and validate parameters
            const systemId = Number.parseInt(query.system_id as string);
            const distanceInMeters = Number.parseInt(
                query.distanceInMeters as string
            );
            const x = Number.parseFloat(query.x as string);
            const y = Number.parseFloat(query.y as string);
            const z = Number.parseFloat(query.z as string);
            const days = Number.parseInt(query.days as string) || 1;
            const limit = Number.parseInt(query.limit as string) || 10;

            if (
                Number.isNaN(systemId) ||
                Number.isNaN(distanceInMeters) ||
                Number.isNaN(x) ||
                Number.isNaN(y) ||
                Number.isNaN(z)
            ) {
                throw createError({
                    statusCode: 400,
                    statusMessage:
                        "Invalid parameter format. Numeric values expected.",
                });
            }

            // Calculate the time threshold
            const timeThreshold = new Date(Date.now() - days * 86400 * 1000);

            // First filter stage - use the optimized index to narrow down candidates
            // This pre-filtering using the index significantly reduces the amount of data to process
            const results: NearCoordinatesResult[] = await Killmails.aggregate([
                {
                    $match: {
                        system_id: systemId,
                        kill_time: { $gte: timeThreshold },
                        // Use cube approximation for first filter (index-friendly)
                        x: {
                            $gt: x - distanceInMeters,
                            $lt: x + distanceInMeters,
                        },
                        y: {
                            $gt: y - distanceInMeters,
                            $lt: y + distanceInMeters,
                        },
                        z: {
                            $gt: z - distanceInMeters,
                            $lt: z + distanceInMeters,
                        },
                    },
                },
                {
                    $project: {
                        killmail_id: 1,
                        kill_time: 1,
                        total_value: 1,
                        victim: {
                            ship_id: 1,
                            ship_name: 1,
                        },
                        distance: {
                            $sqrt: {
                                $add: [
                                    { $pow: [{ $subtract: ["$x", x] }, 2] },
                                    { $pow: [{ $subtract: ["$y", y] }, 2] },
                                    { $pow: [{ $subtract: ["$z", z] }, 2] },
                                ],
                            },
                        },
                    },
                },
                // Second filter stage - precise distance calculation
                { $match: { distance: { $lt: distanceInMeters } } },
                { $sort: { distance: 1 } }, // Sort by closest first
                { $limit: Math.min(limit, 50) }, // Cap at 50 to prevent excessive results
            ]).option({
                hint: { system_id: -1, x: -1, y: -1, z: -1 }, // Use our spatial index
            });

            if (results.length === 0) {
                return {
                    results: [],
                    count: 0,
                    message:
                        "No killmails found near these coordinates within the specified distance.",
                };
            }

            return {
                results,
                count: results.length,
            };
        } catch (error: any) {
            if (error.statusCode) {
                throw error;
            }

            console.error(`Error in nearCoordinates: ${error.message}`);
            throw createError({
                statusCode: 500,
                statusMessage: "Error while searching for nearby killmails",
            });
        }
    },
    {
        maxAge: 300, // Cache for 5 minutes (5 * 60)
        staleMaxAge: -1,
        swr: true,
        base: "redis",
        shouldBypassCache: (event) => {
            return process.env.NODE_ENV !== "production";
        },
        getKey: (event) => {
            const query = getQuery(event);
            const systemId = query?.system_id
                ? query.system_id.toString()
                : "unknown";
            const x = query?.x ? query.x.toString() : "unknown";
            const y = query?.y ? query.y.toString() : "unknown";
            const z = query?.z ? query.z.toString() : "unknown";
            const distanceInMeters = query?.distanceInMeters
                ? query.distanceInMeters.toString()
                : "unknown";
            const days = query?.days ? query.days.toString() : "unknown";
            const limit = query?.limit ? query.limit.toString() : "unknown";
            return `killmail:nearCoordinates:systemId:${systemId}:x:${x}:y:${y}:z:${z}:distanceInMeters:${distanceInMeters}:days:${days}:limit:${limit}`;
        },
    }
);
