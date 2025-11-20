import prisma from "~/lib/prisma";

export default defineCachedEventHandler(
    async (event) => {
        const query = getQuery(event);
        const celestialId = Number.parseInt(query.celestial_id as string);
        const distanceInMeters = Number.parseInt(
            query.distanceInMeters as string
        );
        const days = Number.parseInt(query.days as string) || 1;

        const celestial = await prisma.celestial.findUnique({
            where: { item_id: celestialId },
            select: {
                item_id: true,
                solar_system_id: true,
                x: true,
                y: true,
                z: true,
            },
        });
        if (!celestial) {
            return { error: "Celestial not found" };
        }

        const results = await prisma.$queryRaw<
            { killmail_id: number; distance: number }[]
        >`
            SELECT
                km.killmail_id,
                sqrt(
                    pow(coalesce(kv.x,0) - ${celestial.x}, 2) +
                    pow(coalesce(kv.y,0) - ${celestial.y}, 2) +
                    pow(coalesce(kv.z,0) - ${celestial.z}, 2)
                ) as distance
            FROM killmails km
            JOIN killmail_victims kv ON kv.killmail_id = km.killmail_id
            WHERE
                km.solar_system_id = ${celestial.solar_system_id}
                AND km.killmail_time >= (NOW() - interval '${days} days')
                AND kv.x BETWEEN ${celestial.x - distanceInMeters} AND ${celestial.x + distanceInMeters}
                AND kv.y BETWEEN ${celestial.y - distanceInMeters} AND ${celestial.y + distanceInMeters}
                AND kv.z BETWEEN ${celestial.z - distanceInMeters} AND ${celestial.z + distanceInMeters}
            ORDER BY distance ASC
            LIMIT 10
        `;

        return results;
    },
    {
        maxAge: 300,
        staleMaxAge: -1,
        swr: true,
        base: "redis",
        getKey: (event) => {
            const query = getQuery(event);
            const celestialId = query.celestial_id as string;
            const distanceInMeters = query.distanceInMeters as string;
            const days = (query.days as string) || "1";
            return `killmail:nearCelestial:celestialId:${celestialId}:distance:${distanceInMeters}:days:${days}`;
        },
    }
);
