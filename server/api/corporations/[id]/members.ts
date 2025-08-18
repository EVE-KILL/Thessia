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
        const skip = (page - 1) * limit;

        // Find all members that are in this corporation (paginated)
        const [members, total] = await Promise.all([
            Characters.find(
                { corporation_id: corporationId },
                { _id: 0, character_id: 1, name: 1 }
            )
                .skip(skip)
                .limit(limit)
                .lean(),
            Characters.countDocuments({ corporation_id: corporationId }),
        ]);

        return {
            members,
            total,
            page,
            limit,
            pageCount: Math.ceil(total / limit),
            count: members.length,
        };
    },
    {
        maxAge: 3600,
        staleMaxAge: -1,
        swr: true,
        getKey: (event) => {
            const idParam = event.context.params?.id;
            const query = getQuery(event);
            const page = query.page?.toString() || "1";
            const limit = query.limit?.toString() || "1000";
            return `corporations:${idParam}:members:page:${page}:limit:${limit}`;
        },
    }
);
