import { Prices } from "../../../../models/Prices";
import { Regions } from "../../../../models/Regions";

/**
 * Item Market Stats API
 * Provides market pricing information for the Market Activity section
 * - Jita (The Forge) average price
 * - Cheapest price across all regions
 */
export default defineCachedEventHandler(
    async (event) => {
        try {
            const typeId = event.context.params?.id;

            if (!typeId) {
                throw createError({
                    statusCode: 400,
                    statusMessage: "Type ID is required",
                });
            }

            const typeIdNum = parseInt(typeId);

            // Execute optimized queries in parallel - get most recent data efficiently
            const [jitaPrice, recentPrices] = await Promise.all([
                // Jita (The Forge) price - get most recent for this region
                Prices.findOne(
                    {
                        type_id: typeIdNum,
                        region_id: 10000002,
                    },
                    {
                        average: 1,
                        highest: 1,
                        lowest: 1,
                        volume: 1,
                        order_count: 1,
                        date: 1,
                    }
                ).sort({ date: -1 }), // Get most recent Jita price

                // Get recent prices from all regions (last 7 days max) to find cheapest
                Prices.find(
                    {
                        type_id: typeIdNum,
                        date: {
                            $gte: new Date(
                                Date.now() - 7 * 24 * 60 * 60 * 1000
                            ), // Last 7 days only
                        },
                    },
                    {
                        average: 1,
                        region_id: 1,
                        volume: 1,
                        order_count: 1,
                        date: 1,
                    }
                )
                    .sort({ average: 1 }) // Sort by price to get cheapest
                    .limit(1), // Just get the cheapest one
            ]);

            // Extract cheapest price from array
            const cheapestPrice = recentPrices?.[0] || null;

            // Early return if no price data found
            if (!jitaPrice && !cheapestPrice) {
                return {
                    typeId: typeIdNum,
                    jitaPrice: null,
                    cheapestPrice: null,
                    dataDate: null,
                };
            }

            // Get region name for the cheapest price
            let cheapestRegionName = null;
            if (cheapestPrice?.region_id) {
                const region = await Regions.findOne(
                    { region_id: cheapestPrice.region_id },
                    { name: 1 }
                );
                cheapestRegionName = region?.name;
            }

            return {
                typeId: typeIdNum,
                dataDate: jitaPrice?.date || cheapestPrice?.date || null,
                jitaPrice: jitaPrice
                    ? {
                          average: jitaPrice.average,
                          highest: jitaPrice.highest,
                          lowest: jitaPrice.lowest,
                          volume: jitaPrice.volume,
                          orderCount: jitaPrice.order_count,
                      }
                    : null,
                cheapestPrice: cheapestPrice
                    ? {
                          average: cheapestPrice.average,
                          regionId: cheapestPrice.region_id,
                          regionName: cheapestRegionName,
                          volume: cheapestPrice.volume,
                          orderCount: cheapestPrice.order_count,
                      }
                    : null,
            };
        } catch (error: any) {
            if (error.statusCode) {
                throw error;
            }

            throw createError({
                statusCode: 500,
                statusMessage: "Error retrieving market stats",
            });
        }
    },
    {
        maxAge: 1800, // 30 minutes cache
        staleMaxAge: -1,
        swr: true,
        base: "redis",
        getKey: (event) => {
            const typeId = event.context.params?.id;
            return `market-stats:${typeId}`;
        },
    }
);
