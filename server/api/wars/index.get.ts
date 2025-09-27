import { WarService } from "../../services";

export default defineCachedEventHandler(
    async (event) => {
        const query = getQuery(event);
        const page = query?.page ? Number.parseInt(query.page as string) : 1;
        const limit = 100000;
        const skip = (page - 1) * limit;

        const wars = await WarService.findMany({
            select: { war_id: true },
            skip,
            take: limit,
        });

        return wars.map((war: any) => war.war_id);
    },
    {
        maxAge: 300,
        staleMaxAge: -1,
        swr: true,
        base: "redis",
        shouldBypassCache: (event) => {
            return process.env.NODE_ENV !== "production";
        },
        getKey: (event) => {
            const query = getQuery(event);
            const page = query?.page ? query.page.toString() : "1";
            return `wars:index:page:${page}`;
        },
    }
);
