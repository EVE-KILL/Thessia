import { Price } from "~/types/IPrice";

async function getPrice(typeId: number, date: Date, regionId: number = 10000002): Promise<number> {
    // Check if a custom price exists
    let price = await customPrices(typeId, date);
    if (price > 0) {
        return price;
    }

    // Try to find the price for the specific date
    let priceRecord: Price | null = await Prices.findOne({
        type_id: typeId,
        region_id: regionId,
        date: date,
    });

    // If no exact date match, get the closest (latest) price
    if (!priceRecord) {
        priceRecord = await Prices.findOne(
            { type_id: typeId, region_id: regionId }
        ).sort({ date: -1 });
    }

    // Return the average price or default to 0.01 if no price is found
    return Number(priceRecord?.average ?? 0.01);
}

async function customPrices(typeId: number, date: Date): Promise<number> {
    // Find all prices for the given type ID
    const prices = await CustomPrices.find({ type_id: typeId }).sort({ date: 1 }).exec();

    // If no price is found, return 0
    if (!prices || prices.length === 0) {
        return 0;
    }

    // If only one price is found, return that price
    if (prices.length === 1) {
        return prices[0].price;
    }

    // If multiple prices are found, find the closest price where the date is less than the incoming date
    let closestPrice = null;

    for (const priceEntry of prices) {
        if (!priceEntry.date || priceEntry.date <= date) {
            // Update closestPrice if this entry is closer to the incoming date
            if (
                !closestPrice ||
                (priceEntry.date && (!closestPrice.date || priceEntry.date > closestPrice.date))
            ) {
                closestPrice = priceEntry;
            }
        }
    }

    // If a valid closest price is found, return it; otherwise, return 0
    return closestPrice ? closestPrice.price : 0;
}

export { getPrice };
