import prisma from "../../lib/prisma";

export class PriceService {
    /**
     * Find price by type_id and region_id
     */
    static async findByTypeAndRegion(typeId: number, regionId: number) {
        return await prisma.price.findFirst({
            where: {
                type_id: typeId,
                region_id: regionId,
            },
            orderBy: { date: "desc" },
        });
    }

    /**
     * Find latest price for a type across all regions
     */
    static async findLatestByType(typeId: number) {
        return await prisma.price.findMany({
            where: { type_id: typeId },
            orderBy: { date: "desc" },
            take: 1,
        });
    }

    /**
     * Find prices for multiple types in a specific region
     */
    static async findByTypesAndRegion(typeIds: number[], regionId: number) {
        return await prisma.price.findMany({
            where: {
                type_id: { in: typeIds },
                region_id: regionId,
            },
            orderBy: { date: "desc" },
        });
    }

    /**
     * Find all prices for a specific region
     */
    static async findByRegion(regionId: number, limit?: number) {
        return await prisma.price.findMany({
            where: { region_id: regionId },
            take: limit,
            orderBy: { date: "desc" },
        });
    }

    /**
     * Find prices for a date range
     */
    static async findByDateRange(
        startDate: Date,
        endDate: Date,
        limit?: number
    ) {
        return await prisma.price.findMany({
            where: {
                date: {
                    gte: startDate,
                    lte: endDate,
                },
            },
            take: limit,
            orderBy: { date: "desc" },
        });
    }

    /**
     * Find prices by type and date range
     */
    static async findByTypeAndDateRange(
        typeId: number,
        startDate: Date,
        endDate: Date
    ) {
        return await prisma.price.findMany({
            where: {
                type_id: typeId,
                date: {
                    gte: startDate,
                    lte: endDate,
                },
            },
            orderBy: { date: "desc" },
        });
    }

    /**
     * Get latest prices for multiple types (best price from any region)
     */
    static async getLatestPricesForTypes(typeIds: number[]) {
        // This is a more complex query - get the latest price for each type
        const prices = await prisma.price.findMany({
            where: { type_id: { in: typeIds } },
            orderBy: { date: "desc" },
        });

        // Group by type_id and get the latest for each
        const latestPrices: Record<number, any> = {};
        for (const price of prices) {
            if (
                !latestPrices[price.type_id] ||
                price.date > latestPrices[price.type_id].date
            ) {
                latestPrices[price.type_id] = price;
            }
        }

        return Object.values(latestPrices);
    }

    /**
     * Create or update price
     */
    static async upsertPrice(priceData: {
        type_id: number;
        average?: number;
        highest?: number;
        lowest?: number;
        region_id: number;
        order_count?: number;
        volume?: number;
        date: Date;
    }) {
        return await prisma.price.upsert({
            where: {
                type_id_region_id_date: {
                    type_id: priceData.type_id,
                    region_id: priceData.region_id,
                    date: priceData.date,
                },
            },
            update: priceData,
            create: priceData,
        });
    }

    /**
     * Bulk create or update prices
     */
    static async upsertMany(
        pricesData: Array<{
            type_id: number;
            average?: number;
            highest?: number;
            lowest?: number;
            region_id: number;
            order_count?: number;
            volume?: number;
            date: Date;
        }>
    ) {
        // For bulk operations, we'll use individual upserts
        // Prisma doesn't have a native bulk upsert for complex unique constraints
        return await Promise.all(
            pricesData.map((priceData) => this.upsertPrice(priceData))
        );
    }

    /**
     * Get average price for a type across all regions
     */
    static async getAveragePrice(typeId: number, days: number = 30) {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - days);

        const prices = await prisma.price.findMany({
            where: {
                type_id: typeId,
                date: {
                    gte: cutoffDate,
                },
                average: {
                    not: null,
                },
            },
        });

        if (prices.length === 0) return null;

        const avgPrice =
            prices.reduce((sum, price) => sum + (price.average || 0), 0) /
            prices.length;
        return Math.round(avgPrice * 100) / 100;
    }

    /**
     * Get price statistics for a type
     */
    static async getPriceStats(
        typeId: number,
        regionId?: number,
        days: number = 30
    ) {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - days);

        const whereClause: any = {
            type_id: typeId,
            date: {
                gte: cutoffDate,
            },
        };

        if (regionId) {
            whereClause.region_id = regionId;
        }

        const prices = await prisma.price.findMany({
            where: whereClause,
            orderBy: { date: "desc" },
        });

        if (prices.length === 0) return null;

        const averages = prices
            .filter((p) => p.average !== null)
            .map((p) => p.average!);
        const highs = prices
            .filter((p) => p.highest !== null)
            .map((p) => p.highest!);
        const lows = prices
            .filter((p) => p.lowest !== null)
            .map((p) => p.lowest!);
        const volumes = prices
            .filter((p) => p.volume !== null)
            .map((p) => p.volume!);

        return {
            priceCount: prices.length,
            avgPrice:
                averages.length > 0
                    ? averages.reduce((a, b) => a + b, 0) / averages.length
                    : null,
            maxPrice: highs.length > 0 ? Math.max(...highs) : null,
            minPrice: lows.length > 0 ? Math.min(...lows) : null,
            totalVolume:
                volumes.length > 0 ? volumes.reduce((a, b) => a + b, 0) : null,
            latestPrice: prices[0],
        };
    }

    /**
     * Get top traded items by volume
     */
    static async getTopTradedItems(
        regionId?: number,
        days: number = 7,
        limit: number = 10
    ) {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - days);

        const whereClause: any = {
            date: {
                gte: cutoffDate,
            },
            volume: {
                not: null,
                gt: 0,
            },
        };

        if (regionId) {
            whereClause.region_id = regionId;
        }

        const result = await prisma.price.groupBy({
            by: ["type_id"],
            where: whereClause,
            _sum: {
                volume: true,
            },
            _avg: {
                average: true,
            },
            orderBy: {
                _sum: {
                    volume: "desc",
                },
            },
            take: limit,
        });

        return result.map((item) => ({
            type_id: item.type_id,
            totalVolume: item._sum.volume || 0,
            avgPrice: item._avg.average || 0,
        }));
    }

    /**
     * Delete old price data (older than specified date)
     */
    static async deleteOldPrices(olderThan: Date) {
        return await prisma.price.deleteMany({
            where: {
                date: {
                    lt: olderThan,
                },
            },
        });
    }

    /**
     * Count total price entries
     */
    static async count(): Promise<number> {
        return await prisma.price.count();
    }
}
