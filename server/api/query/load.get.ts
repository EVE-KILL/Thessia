import type { H3Event } from "h3";
import { SavedQuery } from "~/server/models/SavedQuery";

export default defineEventHandler(async (event: H3Event) => {
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
        // Find the saved query by hash
        const savedQuery = await SavedQuery.findOne({ hash: id });

        if (!savedQuery) {
            // For testing purposes, create a sample query if it doesn't exist
            // This is just for development and should be removed in production
            const sampleQuery = {
                filter: {
                    "victim.alliance_id": 99003581
                },
                options: {
                    sort: { "kill_time": -1 },
                    limit: 50
                }
            };

            await SavedQuery.create({
                hash: id,
                title: "Sample Query",
                description: "Automatically created sample query",
                query: sampleQuery
            });

            // Return the sample data
            return {
                title: "Sample Query",
                description: "Automatically created sample query",
                query: sampleQuery,
                hash: id
            };
        }

        // Return the saved query data
        return {
            title: savedQuery.title,
            description: savedQuery.description,
            query: savedQuery.query,
            hash: savedQuery.hash,
        };
    } catch (err) {
        throw createError({
            statusCode: 500,
            statusMessage: "Failed to load saved query",
        });
    }
});
