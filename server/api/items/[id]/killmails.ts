const shipGroupIds = [
  25, 26, 27, 28, 29, 30, 31, 237, 324, 358, 380, 381, 419, 420, 463, 485, 513, 540, 541, 543, 547,
  659, 830, 831, 832, 833, 834, 883, 893, 894, 898, 900, 902, 906, 941, 963, 1022, 1201, 1202, 1283,
  1305, 1527, 1534, 1538, 1972, 2001, 4594,
];

export default defineEventHandler(async (event) => {
    const query = getQuery(event);
    const typeId: number | null = event.context.params?.id
        ? Number.parseInt(event.context.params.id)
        : null;
    const limit = query.limit ? Number.parseInt(query.limit as string) : 10;
    if (!typeId) {
        return { error: "Type ID not provided" };
    }

    const type = await InvTypes.findOne({ type_id: typeId });
    const typeGroupId = type?.group_id;

    // Define the query condition based on whether the item is a ship or not
    let queryCondition = {};
    let indexHint = {};

    if (typeGroupId && shipGroupIds.includes(typeGroupId)) {
        // If it's a ship, search for victim.ship_id
        queryCondition = { "victim.ship_id": typeId };
        indexHint = "victim.ship_id_-1_kill_time_-1";

    } else {
        // For non-ship items, search for items.type_id
        queryCondition = { "items.type_id": typeId };
        indexHint = "items.type_id_-1_kill_time_-1";
    }

    const killmails = await Killmails.find(
        queryCondition,
        {
            _id: 0,
        },
        {
            limit: limit,
            sort: { killmail_id: -1 },
        }
    ).hint(indexHint);

    return killmails.map((killmail) => {
        return {
            killmail_id: killmail.killmail_id,
            victim: {
                ship_id: killmail.victim.ship_id,
                ship_name: killmail.victim.ship_name,
                character_id: killmail.victim.character_id,
                character_name: killmail.victim.character_name,
                corporation_id: killmail.victim.corporation_id,
                corporation_name: killmail.victim.corporation_name,
                alliance_id: killmail.victim.alliance_id,
                alliance_name: killmail.victim.alliance_name,
            },
        };
    });
});
