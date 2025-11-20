import prisma from "~/lib/prisma";
import { PriceService, TypeService } from "~/server/services";

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

            // Fetch the type once so we can build downstream queries
            const item = await TypeService.findById(typeId);

            if (!item) {
                throw createError({
                    statusCode: 404,
                    statusMessage: "Item not found",
                });
            }

            const isShipType =
                item.group_id !== null && shipGroupIds.includes(item.group_id);

            // Build Prisma filter
            const killmailWhere: any = isShipType
                ? {
                      OR: [
                          { victim: { ship_type_id: typeId } },
                          {
                              items: {
                                  some: {
                                      item_type_id: typeId,
                                  },
                              },
                          },
                      ],
                  }
                : {
                      items: {
                          some: {
                              item_type_id: typeId,
                          },
                      },
                  };

            // Execute remaining queries in parallel for maximum performance
            const [killmails, prices] = await Promise.all([
                prisma.killmail.findMany({
                    where: killmailWhere,
                    include: {
                        victim: {
                            include: {
                                ship_type: { select: { name: true } },
                                ship_group: { select: { group_name: true } },
                                character: { select: { name: true } },
                                corporation: { select: { name: true } },
                                alliance: { select: { name: true } },
                                faction: { select: { name: true } },
                            },
                        },
                        attackers: {
                            where: { final_blow: true },
                            include: {
                                character: { select: { name: true } },
                                corporation: { select: { name: true } },
                                alliance: { select: { name: true } },
                                faction: { select: { name: true } },
                                ship_group: { select: { group_name: true } },
                            },
                        },
                        solar_system: {
                            select: {
                                system_name: true,
                                security: true,
                                region_id: true,
                                region: { select: { region_name: true } },
                            },
                        },
                        region: { select: { region_name: true } },
                    },
                    orderBy: { killmail_time: "desc" },
                    take: killmailLimit,
                }),
                PriceService.findByTypeSince(
                    typeId,
                    new Date(Date.now() - priceDays * 24 * 60 * 60 * 1000),
                    regionId
                ),
            ]);

            // Format killmails data
            const formattedKillmails = killmails.map((killmail) => {
                // Find final blow attacker
                const finalBlowAttacker = killmail.attackers?.find(
                    (attacker) => attacker.final_blow === true
                );

                return {
                    killmail_id: killmail.killmail_id,
                    kill_time: killmail.killmail_time,
                    total_value: killmail.total_value
                        ? Number(killmail.total_value)
                        : null,
                    system_id: killmail.solar_system_id,
                    system_name:
                        killmail.solar_system?.system_name ||
                        killmail.solar_system_id,
                    region_name:
                        killmail.region?.region_name ||
                        killmail.solar_system?.region?.region_name ||
                        null,
                    victim: {
                        ship_id: killmail.victim?.ship_type_id || null,
                        ship_name: killmail.victim?.ship_type?.name || {},
                        ship_group_name:
                            killmail.victim?.ship_group?.group_name || {},
                        character_id: killmail.victim?.character_id || null,
                        character_name:
                            killmail.victim?.character?.name || undefined,
                        corporation_id:
                            killmail.victim?.corporation_id || null,
                        corporation_name:
                            killmail.victim?.corporation?.name || undefined,
                        alliance_id: killmail.victim?.alliance_id || null,
                        alliance_name:
                            killmail.victim?.alliance?.name || undefined,
                        faction_name:
                            killmail.victim?.faction?.name || undefined,
                    },
                    finalblow: finalBlowAttacker
                        ? {
                              character_id:
                                  finalBlowAttacker.character_id || null,
                              character_name:
                                  finalBlowAttacker.character?.name || "",
                              corporation_id:
                                  finalBlowAttacker.corporation_id || null,
                              corporation_name:
                                  finalBlowAttacker.corporation?.name || "",
                              alliance_id:
                                  finalBlowAttacker.alliance_id || null,
                              alliance_name:
                                  finalBlowAttacker.alliance?.name || "",
                              faction_name:
                                  finalBlowAttacker.faction?.name || "",
                          }
                        : null,
                };
            });

            return {
                item,
                killmails: formattedKillmails,
                prices: prices.map((price) => ({
                    ...price,
                    average:
                        price.average !== null ? Number(price.average) : null,
                    highest:
                        price.highest !== null ? Number(price.highest) : null,
                    lowest: price.lowest !== null ? Number(price.lowest) : null,
                    volume: price.volume !== null ? Number(price.volume) : null,
                })),
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
