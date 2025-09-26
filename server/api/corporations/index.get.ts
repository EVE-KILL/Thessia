import { CorporationService } from "~/server/services";

export default defineCachedEventHandler(
    async (event) => {
        const query = getQuery(event);
        const page = query?.page ? Number.parseInt(query.page as string) : 1;
        const limit = 100000;
        const skip = (page - 1) * limit;

        const corporations = await CorporationService.findMany({
            select: { corporation_id: true },
            skip,
            take: limit,
        });

        // Return a single array containing all the IDs
        return corporations.map((corporation) => corporation.corporation_id);
    },
    {
        maxAge: 3600,
        staleMaxAge: -1,
        swr: true,
        base: "redis",
        getKey: (event) => {
            const query = getQuery(event);
            const page = query?.page ? query.page.toString() : "1";
            return `corporations:index:page:${page}`;
        },
    }
);
