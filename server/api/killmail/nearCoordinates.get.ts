import prisma from "~/lib/prisma";

interface NearCoordinatesRow {
    killmail_id: number;
    distance: number;
    kill_time: Date;
    total_value: number;
    victim_ship_id: number | null;
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

            const results = await prisma.$queryRaw<NearCoordinatesRow[]>`
                SELECT
                    km.killmail_id,
                    km.killmail_time as kill_time,
                    COALESCE(km.total_value, 0) as total_value,
                    kv.ship_type_id as victim_ship_id,
                    sqrt(
                        pow(coalesce(kv.x,0) - ${x}, 2) +
                        pow(coalesce(kv.y,0) - ${y}, 2) +
                        pow(coalesce(kv.z,0) - ${z}, 2)
                    ) as distance
                FROM killmails km
                JOIN killmail_victims kv ON kv.killmail_id = km.killmail_id
                WHERE
                    km.solar_system_id = ${systemId}
                    AND km.killmail_time >= ${timeThreshold}
                    AND kv.x BETWEEN ${x - distanceInMeters} AND ${x + distanceInMeters}
                    AND kv.y BETWEEN ${y - distanceInMeters} AND ${y + distanceInMeters}
                    AND kv.z BETWEEN ${z - distanceInMeters} AND ${z + distanceInMeters}
                ORDER BY distance ASC
                LIMIT ${Math.min(limit, 50)}
            `;

            const mapped = results.map((row) => ({
                killmail_id: row.killmail_id,
                distance: Number(row.distance),
                kill_time: row.kill_time,
                total_value: Number(row.total_value),
                victim: {
                    ship_id: row.victim_ship_id || 0,
                    ship_name: {},
                },
            }));

            if (mapped.length === 0) {
                return {
                    results: [],
                    count: 0,
                    message:
                        "No killmails found near these coordinates within the specified distance.",
                };
            }

            return {
                results: mapped,
                count: mapped.length,
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
