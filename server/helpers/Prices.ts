import type { IPrice } from "~/server/interfaces/IPrice";
import { InvTypes } from "~/server/models/InvTypes";
import { Prices } from "~/server/models/Prices";
import { customPriceCache } from "./RuntimeCache";

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
    const cached = customPriceCache.get(typeId);
    if (!cached) return 0;
    // Assume cached has a 'date' property (string or Date) and a 'price' property
    const recordDate = cached.date ? new Date(cached.date) : null;
    if (!recordDate || recordDate <= date) {
        return cached.price;
    }
    return 0;
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

