import type { IPrice } from "~/server/interfaces/IPrice";
import { CustomPrices } from "~/server/models/CustomPrices";
import { InvTypes } from "~/server/models/InvTypes";
import { Prices } from "~/server/models/Prices";

async function getPrice(typeId: number, date: Date, regionId = 10000002): Promise<number> {
    // Check if a custom price exists
    const price = await customPrices(typeId, date);
    if (price > 0) {
        return price;
    }

    // Try to find the price for the specific date
    let priceRecord: IPrice | null = await Prices.findOne({
        type_id: typeId,
        region_id: regionId,
        date: date,
    });

    // If no exact date match, get the closest (latest) price
    if (!priceRecord) {
        priceRecord = await Prices.findOne({ type_id: typeId, region_id: regionId }).sort({ date: -1 });
    }

    // Return the average price or default to 0.01 if no price is found
    return Number(priceRecord?.average ?? 0.01);
}

async function customPrices(typeId: number, date: Date): Promise<number> {
    let customPrice = 0;

    // Check if there is a price with a date that's greater than or equal to the provided date
    const customPriceRecord = await CustomPrices.findOne({
        type_id: typeId,
        date: { $gte: date },
    });

    if (customPriceRecord) {
        customPrice = customPriceRecord.price;
    }

    // Check the database for a custom price
    const customPriceFromDb = await CustomPrices.findOne({ type_id: typeId });
    if (customPriceFromDb) {
        customPrice = customPriceFromDb.price;
    }

    return customPrice;
}

async function getPriceFromBlueprint(typeId: number, date: Date, regionId = 10000002): Promise<number> {
    const entity = await InvTypes.findOne({ type_id: typeId });
    const materials = entity?.type_materials;

    let cumulativePrice = entity?.base_price || 0;

    // Use Object.values to get an array of material objects
    for (const material of Object.values(materials)) {
        const materialTypeId = material.material_type_id;
        const materialQuantity = material.quantity;

        const materialPrice = await getPrice(materialTypeId, date, regionId);
        cumulativePrice += materialPrice * materialQuantity;
    }

    return cumulativePrice * 1.15; // Add 10% for manufacturing cost and 5% for profit
}

export { customPrices, getPrice, getPriceFromBlueprint };

