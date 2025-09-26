import { SavedQueryService } from "~/server/services";

export default defineEventHandler(async (event) => {
    // Get the query ID from the URL query parameters
    const query = getQuery(event);
    const id = query.id as string;

    if (!id) {
        throw createError({
            statusCode: 400,
            statusMessage: "Missing query ID",
        });
    }

    try {
        // Find the saved query by query_id (hash)
        const savedQuery = await SavedQueryService.findByQueryId(id);

        if (!savedQuery) {
            // For testing purposes, create a sample query if it doesn't exist
            // This is just for development and should be removed in production
            const sampleQuery = {
                filter: {
                    "victim.alliance_id": 99003581,
                },
                options: {
                    sort: { kill_time: -1 },
                    limit: 50,
                },
            };

            await SavedQueryService.create({
                query_id: id,
                name: "Sample Query",
                description: "Automatically created sample query",
                query_data: sampleQuery,
            });

            // Return the sample data
            return {
                title: "Sample Query",
                description: "Automatically created sample query",
                query: sampleQuery,
                hash: id,
            };
        }

        // Return the saved query data (map Prisma fields back to API format)
        return {
            title: savedQuery.name,
            description: savedQuery.description,
            query: savedQuery.query_data,
            hash: savedQuery.query_id,
        };
    } catch (err) {
        throw createError({
            statusCode: 500,
            statusMessage: "Failed to load saved query",
        });
    }
});
