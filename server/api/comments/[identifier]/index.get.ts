import { cliLogger } from "~/server/helpers/Logger";
import { Comments } from "~/server/models/Comments";

export default defineCachedEventHandler(async (event) => {
    const identifier = event.context.params?.identifier;

    if (!identifier) {
        cliLogger.error("Comment API called without identifier");
        return createError({
            statusCode: 400,
            statusMessage: "Identifier is required",
        });
    }

    try {
        cliLogger.debug(`Fetching comments for killIdentifier: ${identifier}`);

        // Always hide deleted comments from everyone
        const query = {
            killIdentifier: identifier,
            deleted: false,
        };

        cliLogger.debug(`Comment query: ${JSON.stringify(query)}`);

        // Fetch comments for the given kill identifier, sorted by createdAt in descending order
        const comments = await Comments.find(query).sort({ createdAt: -1 }).lean().exec();

        return comments;
    } catch (error) {
        cliLogger.error(`Error fetching comments: ${error}`);
        return createError({
            statusCode: 500,
            statusMessage: "Failed to fetch comments",
        });
    }
}, {
    maxAge: 60, // Using a maxAge of 60 seconds for comments
    staleMaxAge: -1,
    swr: true,
    base: "redis", // Assuming redis is the default cache base
    shouldBypassCache: (event) => {
        return process.env.NODE_ENV !== "production";
    },
    getKey: (event) => {
        // Construct a unique key for this endpoint.
        // This file uses a dynamic parameter `[identifier]`. You MUST include
        // this parameter in the cache key.
        const identifier = event.context.params?.identifier;
        // No query parameters are used in this endpoint.
        return `comments:${identifier}:index`;
    }
});
