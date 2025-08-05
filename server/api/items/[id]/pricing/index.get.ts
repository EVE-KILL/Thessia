/**
 * DEPRECATED: Use /api/items/[id]/summary instead for better performance
 * This endpoint redirects to the summary endpoint and extracts pricing data
 */
/**
 * Get pricing data for a specific item - extracts from summary endpoint
 */
export default defineCachedEventHandler(
    async (event) => {
        const query = getQuery(event as any);
        const regionId = query.regionId
            ? Number.parseInt(query.regionId as string)
            : 10000002;
        const days = query.days ? Number.parseInt(query.days as string) : 30;

        // Call the summary endpoint and extract pricing data
        const summaryData = await $fetch(
            `/api/items/${event.context.params?.id}/summary?regionId=${regionId}&priceDays=${days}`
        );
        return summaryData.prices;
    },
    {
        maxAge: 10 * 60,
        getKey: (event) => {
            const query = getQuery(event as any);
            const regionId = query.regionId || 10000002;
            const days = query.days || 30;
            return `items:${event.context.params?.id}:pricing:${regionId}:${days}`;
        },
    }
);
