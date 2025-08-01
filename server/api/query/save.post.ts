import crypto from "crypto";

export default defineEventHandler(async (event: H3Event) => {
    const body = await readBody(event);
    const { title, description, query, id } = body || {};

    if (!title || !query) {
        throw createError({
            statusCode: 400,
            statusMessage: "Missing title or query",
        });
    }

    try {
        // If id is provided, update existing query
        if (id) {
            const existingQuery = await SavedQuery.findOne({ hash: id });

            if (!existingQuery) {
                throw createError({
                    statusCode: 404,
                    statusMessage: "Query not found",
                });
            }

            // Update the existing query
            existingQuery.title = title;
            existingQuery.description = description || "";
            existingQuery.query = query;
            await existingQuery.save();

            return { hash: id };
        }

        // Generate a unique hash based on query + timestamp for new queries
        const hash = crypto
            .createHash("sha256")
            .update(JSON.stringify(query) + title + Date.now())
            .digest("hex")
            .slice(0, 10);

        // Save new query to DB
        await SavedQuery.create({
            hash,
            title,
            description: description || "",
            query,
        });

        return { hash };
    } catch (err) {
        console.error("Error saving query:", err);
        throw createError({
            statusCode: 500,
            statusMessage: "Failed to save query",
        });
    }
});
