/**
 * Get killmails for a specific item - extracts from summary endpoint
 */
export default defineCachedEventHandler(
    async (event) => {
        const query = getQuery(event);
        const limit = Math.min(
            Math.max(Number.parseInt((query.limit as string) || "20"), 1),
            100
        );

        // Call the summary endpoint and extract killmails
        const summaryData = await $fetch(
            `/api/items/${event.context.params?.id}/summary?killmailLimit=${limit}`
        );
        return summaryData.killmails;
    },
    {
        maxAge: 10 * 60,
        getKey: (event) => {
            const query = getQuery(event);
            return `items:${event.context.params?.id}:killmails:${
                query.limit || 20
            }`;
        },
    }
);
