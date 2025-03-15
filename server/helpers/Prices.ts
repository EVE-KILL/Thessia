import type { IPrice } from "../interfaces/IPrice";
import { Prices } from "../models/Prices";
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

export { getPrice };
