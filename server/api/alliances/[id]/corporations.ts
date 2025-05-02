import { defineEventHandler, getQuery } from "h3";
import { Corporations } from "~/server/models/Corporations";

export default defineEventHandler(async (event) => {
    const allianceId: number | null = event.context.params?.id
        ? Number.parseInt(event.context.params.id)
        : null;
    if (!allianceId) {
        return { error: "Alliance ID not provided" };
    }

    const query = getQuery(event);
    const page = query.page ? Math.max(1, Number.parseInt(query.page as string)) : 1;
    const limit = query.limit ? Math.min(1000, Math.max(1, Number.parseInt(query.limit as string))) : 1000;
    const skip = (page - 1) * limit;

    // Find all corporations that are in this alliance (paginated)
    const [corporations, total] = await Promise.all([
        Corporations.find(
            { alliance_id: allianceId },
            { _id: 0, corporation_id: 1, name: 1 },
        ).skip(skip).limit(limit).lean(),
        Corporations.countDocuments({ alliance_id: allianceId })
    ]);

    return {
        corporations,
        total,
        page,
        limit,
        pageCount: Math.ceil(total / limit),
        count: corporations.length,
    };
});
