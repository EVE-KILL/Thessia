import { getCachedItemMarketData } from "../../../../helpers/RuntimeCache";
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

            // Get cached market data
            const { jitaPrice, recentPrices } = await getCachedItemMarketData(
                typeIdNum
            );

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
