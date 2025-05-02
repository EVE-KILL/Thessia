import { defineEventHandler } from "h3";
import { Characters } from "~/server/models/Characters";

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

    // Find all members that are in this alliance (paginated)
    const [members, total] = await Promise.all([
        Characters.find(
            { alliance_id: allianceId },
            { _id: 0, character_id: 1, name: 1 },
        ).skip(skip).limit(limit).lean(),
        Characters.countDocuments({ alliance_id: allianceId })
    ]);

    return {
        members,
        total,
        page,
        limit,
        pageCount: Math.ceil(total / limit),
        count: members.length,
    };
});
