import prisma from "~/lib/prisma";

export default defineCachedEventHandler(
    async () => {
        const rows = await prisma.$queryRaw<{ day: string; count: bigint }[]>`
            SELECT to_char(killmail_time::date, 'YYYY-MM-DD') as day, COUNT(*) as count
            FROM killmails
            GROUP BY day
            ORDER BY day ASC
        `;

        const result: Record<string, number> = {};
        for (const row of rows) {
            result[row.day] = Number(row.count || 0);
        }

        return result;
    },
    {
        maxAge: 300,
        staleMaxAge: -1,
        swr: true,
        base: "redis",
        shouldBypassCache: () => {
            return process.env.NODE_ENV !== "production";
        },
        getKey: () => {
            return `killmail:history:all`;
        },
    }
);
