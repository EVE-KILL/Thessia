import type { H3Event } from "h3";
import { sendError } from "h3";
import { calculateShortStats } from "~/server/helpers/Stats";

export default defineEventHandler(async (event: H3Event) => {
    const { id } = event.context.params as { id: string };
    if (!id) {
        return sendError(event, createError({ statusCode: 400, statusMessage: "Missing alliance id" }));
    }

    try {
        // Default to 90 days for short stats
        const stats = await calculateShortStats("alliance_id", Number(id), 90);
        return stats;
    } catch (error) {
        return sendError(event, createError({ statusCode: 500, statusMessage: "Failed to fetch alliance short stats" }));
    }
});
