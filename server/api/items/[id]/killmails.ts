export default defineEventHandler(async (event) => {
  const query = getQuery(event);
  const typeId: number | null = event.context.params?.id
    ? Number.parseInt(event.context.params.id)
    : null;
  const limit = query.limit ? Number.parseInt(query.limit as string) : 10;
  if (!typeId) {
    return { error: "Type ID not provided" };
  }

  const killmails = await Killmails.find(
    {
      $or: [{ "items.type_id": typeId }, { "victim.ship_id": typeId }],
    },
    {
      _id: 0,
    },
  )
    .limit(limit)
    .sort({ killmail_id: -1 });

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
