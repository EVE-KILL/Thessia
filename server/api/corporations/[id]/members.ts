import { CharacterService } from "~/server/services";

export default defineCachedEventHandler(
    async (event) => {
        const corporationId: number | null = event.context.params?.id
            ? Number.parseInt(event.context.params.id)
            : null;
        if (!corporationId) {
            return { error: "Corporation ID not provided" };
        }

        const query = getQuery(event);
        const page = query.page
            ? Math.max(1, Number.parseInt(query.page as string))
            : 1;
        const limit = query.limit
            ? Math.min(
                  1000,
                  Math.max(1, Number.parseInt(query.limit as string))
              )
            : 1000;

        return await CharacterService.findByCorporationId(
            corporationId,
            page,
            limit
        );
    },
    {
        maxAge: 3600,
        staleMaxAge: -1,
        swr: true,
        base: "redis",
        getKey: (event) => {
            const idParam = event.context.params?.id;
            const query = getQuery(event);
            const page = query.page?.toString() || "1";
            const limit = query.limit?.toString() || "1000";
            return `corporations:${idParam}:members:page:${page}:limit:${limit}`;
        },
    }
);
