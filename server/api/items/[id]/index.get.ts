/**
 * Optimized endpoint that fetches item details, recent killmails, and pricing data in a single request
 * This reduces the number of API calls and improves performance significantly
 */
export default defineCachedEventHandler(
    async (event) => {
        try {
            const typeId: number | null = event.context.params?.id
                ? Number.parseInt(event.context.params.id)
                : null;

            if (!typeId || Number.isNaN(typeId)) {
                throw createError({
                    statusCode: 400,
                    statusMessage: "Valid Type ID is required",
                });
            }

            const query = getQuery(event);
            const killmailLimit = Math.min(
                Math.max(
                    Number.parseInt((query.killmailLimit as string) || "20"),
                    1
                ),
                50
            );
            const regionId = Number.parseInt(
                (query.regionId as string) || "10000002"
            ); // The Forge
            const priceDays = Math.min(
                Math.max(
                    Number.parseInt((query.priceDays as string) || "30"),
                    1
                ),
                90
            );

            // Define ship group IDs
            const shipGroupIds = [
                25, 26, 27, 28, 29, 30, 31, 237, 324, 358, 380, 381, 419, 420,
                463, 485, 513, 540, 541, 543, 547, 659, 830, 831, 832, 833, 834,
                883, 893, 894, 898, 900, 902, 906, 941, 963, 1022, 1201, 1202,
                1283, 1305, 1527, 1534, 1538, 1972, 2001, 4594,
            ];

            // Execute all queries in parallel for maximum performance
            const [item, killmails, prices] = await Promise.all([
                // Get item details
                InvTypes.findOne(
                    { type_id: typeId },
                    {
                        _id: 0,
                        dogma_attributes: 0,
                        dogma_effects: 0,
                        createdAt: 0,
                        updatedAt: 0,
                    }
                ).lean(),

                // Get recent killmails
                (async () => {
                    // First check if this is a ship type
                    const type = await InvTypes.findOne(
                        { type_id: typeId },
                        { group_id: 1 }
                    ).lean();

                    if (!type) return [];

                    const typeGroupId = type.group_id;
                    let queryCondition = {};

                    if (typeGroupId && shipGroupIds.includes(typeGroupId)) {
                        // If it's a ship, search for victim.ship_id
                        queryCondition = { "victim.ship_id": typeId };
                    } else {
                        // For non-ship items, search for items.type_id
                        queryCondition = { "items.type_id": typeId };
                    }

                    return Killmails.find(queryCondition, {
                        _id: 0,
                        killmail_id: 1,
                        kill_time: 1,
                        total_value: 1,
                        system_id: 1,
                        system_name: 1,
                        region_name: 1,
                        "victim.ship_id": 1,
                        "victim.ship_name": 1,
                        "victim.ship_group_name": 1,
                        "victim.character_id": 1,
                        "victim.character_name": 1,
                        "victim.corporation_id": 1,
                        "victim.corporation_name": 1,
                        "victim.alliance_id": 1,
                        "victim.alliance_name": 1,
                        "victim.faction_name": 1,
                        "attackers.final_blow": 1,
                        "attackers.character_id": 1,
                        "attackers.character_name": 1,
                        "attackers.corporation_id": 1,
                        "attackers.corporation_name": 1,
                        "attackers.alliance_id": 1,
                        "attackers.alliance_name": 1,
                        "attackers.faction_name": 1,
                    })
                        .sort({ kill_time: -1 })
                        .limit(killmailLimit)
                        .lean();
                })(),

                // Get pricing data
                Prices.find(
                    {
                        type_id: typeId,
                        region_id: regionId,
                        date: {
                            $gte: new Date(
                                Date.now() - priceDays * 24 * 60 * 60 * 1000
                            ),
                        },
                    },
                    {
                        _id: 0,
                        date: 1,
                        lowest: 1,
                        average: 1,
                        highest: 1,
                    }
                )
                    .sort({ date: -1 })
                    .limit(30) // Limit to last 30 entries
                    .lean(),
            ]);

            if (!item) {
                throw createError({
                    statusCode: 404,
                    statusMessage: "Item not found",
                });
            }

            // Format killmails data
            const formattedKillmails = killmails.map((killmail) => {
                // Find final blow attacker
                const finalBlowAttacker = killmail.attackers?.find(
                    (attacker) => attacker.final_blow === true
                );

                return {
                    killmail_id: killmail.killmail_id,
                    kill_time: killmail.kill_time,
                    total_value: killmail.total_value,
                    system_id: killmail.system_id,
                    system_name: killmail.system_name,
                    region_name: killmail.region_name,
                    victim: {
                        ship_id: killmail.victim.ship_id,
                        ship_name: killmail.victim.ship_name,
                        ship_group_name: killmail.victim.ship_group_name,
                        character_id: killmail.victim.character_id,
                        character_name: killmail.victim.character_name,
                        corporation_id: killmail.victim.corporation_id,
                        corporation_name: killmail.victim.corporation_name,
                        alliance_id: killmail.victim.alliance_id,
                        alliance_name: killmail.victim.alliance_name,
                        faction_name: killmail.victim.faction_name,
                    },
                    finalblow: finalBlowAttacker
                        ? {
                              character_id: finalBlowAttacker.character_id,
                              character_name: finalBlowAttacker.character_name,
                              corporation_id: finalBlowAttacker.corporation_id,
                              corporation_name:
                                  finalBlowAttacker.corporation_name,
                              alliance_id: finalBlowAttacker.alliance_id,
                              alliance_name: finalBlowAttacker.alliance_name,
                              faction_name: finalBlowAttacker.faction_name,
                          }
                        : null,
                };
            });

            return {
                item,
                killmails: formattedKillmails,
                prices,
                meta: {
                    killmailCount: formattedKillmails.length,
                    priceCount: prices.length,
                    regionId,
                    priceDays,
                },
            };
        } catch (error: any) {
            if (error.statusCode) {
                throw error;
            }

            console.error(`Error fetching item summary: ${error.message}`);
            throw createError({
                statusCode: 500,
                statusMessage: "Error retrieving item summary",
            });
        }
    },
    {
        // Cache for 10 minutes - shorter than individual endpoints due to multiple data types
        maxAge: 10 * 60,
        getKey: (event) => {
            const query = getQuery(event);
            return `item-summary-${event.context.params?.id}-${
                query.killmailLimit || 20
            }-${query.regionId || 10000002}-${query.priceDays || 30}`;
        },
    }
);
