import { getCachedItem } from "./RuntimeCache";

/**
 * Checks if a given type_id belongs to a ship (category_id === 6)
 * Uses the RuntimeCache to efficiently lookup InvTypes data
 */
export async function isShip(typeId: number): Promise<boolean> {
    try {
        const invType = await getCachedItem(typeId);
        return invType?.category_id === 6;
    } catch (error) {
        console.error(`Error checking if type_id ${typeId} is a ship:`, error);
        return false;
    }
}

/**
 * Classifies a type_id as either 'ship' or 'item' based on category_id
 * Ships have category_id === 6, everything else is considered an item
 */
export async function classifyTypeId(typeId: number): Promise<'ship' | 'item'> {
    const shipCheck = await isShip(typeId);
    return shipCheck ? 'ship' : 'item';
}

/**
 * Batch classify multiple type_ids for efficiency
 * Returns a Map of typeId -> classification
 */
export async function batchClassifyTypeIds(typeIds: number[]): Promise<Map<number, 'ship' | 'item'>> {
    const results = new Map<number, 'ship' | 'item'>();
    
    // Process all type_ids in parallel
    const classifications = await Promise.all(
        typeIds.map(async (typeId) => {
            const classification = await classifyTypeId(typeId);
            return { typeId, classification };
        })
    );
    
    // Build the result map
    for (const { typeId, classification } of classifications) {
        results.set(typeId, classification);
    }
    
    return results;
}
