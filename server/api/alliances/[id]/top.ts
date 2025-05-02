import type { H3Event } from 'h3';
import { sendError } from 'h3';
import { topRegions, topShips, topSystems } from '~/server/helpers/TopLists';

export default defineEventHandler(async (event: H3Event) => {
    const query = getQuery(event);
    const allianceId: number | null = event.context.params?.id
        ? Number.parseInt(event.context.params.id)
        : null;
    const topType = (query.type as string) || "";
    if (!allianceId) {
        return sendError(event, createError({ statusCode: 400, statusMessage: "Alliance ID not provided" }));
    }

    if (topType === "") {
        return sendError(event, createError({ statusCode: 400, statusMessage: "Type not provided" }));
    }

    switch (topType) {
        case "ships":
            return await topShips("alliance_id", allianceId, 7, 10);

        case "systems":
            return await topSystems("alliance_id", allianceId, 7, 10);

        case "regions":
            return await topRegions("alliance_id", allianceId, 7, 10);
    }
});
