export default defineCachedEventHandler(
    async (event) => {
        const warId = event.context.params?.id;
        const killmails = (
            await Killmails.find(
                { war_id: warId },
                { killmail_id: 1, killmail_hash: 1 }
            )
        ).map((killmail) => {
            return {
                killmail_id: killmail.killmail_id,
                killmail_hash: killmail.killmail_hash,
            };
        });

        return killmails;
    },
    {
        maxAge: 300, // Using a maxAge of 300 seconds for war killmail data
        staleMaxAge: -1,
        swr: true,
        getKey: (event) => {
            // Construct a unique key for this endpoint.
            // This file uses a dynamic parameter `[id]`, likely representing a war ID.
            // You MUST include this parameter in the cache key.
            const warId = event.context.params?.id; // Assuming the parameter name is 'id' - check file content to confirm
            // Inspect the file content to identify relevant query parameters (e.g., 'page',
            // 'filter', 'sort') and include them in the cache key.
            // No query parameters are used in this handler.
            return `wars:${warId}:killmails:index`; // Adjust based on actual parameter names and query parameters
        },
    }
);
