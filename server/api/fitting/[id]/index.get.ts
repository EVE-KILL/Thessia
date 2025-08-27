import crypto from "node:crypto";

// Define types for better type safety
interface IFittingSlots {
    high_slot: IItem[];
    medium_slot: IItem[];
    low_slot: IItem[];
    rig_slot: IItem[];
    subsystem: IItem[];
    drone_bay: IItem[];
    fighter_bay: IItem[];
}

interface IFittingGroup {
    killmail_id: number;
    killmail_hash: string;
    fitting: IFittingSlots;
    fitting_cost: number;
    count: number;
    ship_value: number;
}

// Allowed ship groups
const shipGroupIds = [
    25, 26, 27, 28, 29, 30, 31, 237, 324, 358, 380, 381, 419, 420, 463, 485,
    513, 540, 541, 543, 547, 659, 830, 831, 832, 833, 834, 883, 893, 894, 898,
    900, 902, 906, 941, 963, 1022, 1201, 1202, 1283, 1305, 1527, 1534, 1538,
    1972, 2001, 4594,
];

const itemSlotTypes = {
    high_slot: [27, 28, 29, 30, 31, 32, 33, 34],
    medium_slot: [19, 20, 21, 22, 23, 24, 25, 26],
    low_slot: [11, 12, 13, 14, 15, 16, 17, 18],
    rig_slot: [92, 93, 94, 95, 96, 97, 98, 99],
    subsystem: [125, 126, 127, 128, 129, 130, 131, 132],
    drone_bay: [87],
    fighter_bay: [158],
};

export default defineCachedEventHandler(
    async (event) => {
        const shipId: number | null = event.context.params?.id
            ? Number.parseInt(event.context.params.id)
            : null;
        if (!shipId) {
            return { error: "Ship ID not provided" };
        }
        const query = getQuery(event);
        let limit = Number.parseInt((query.limit as string) || "10", 10);
        if (Number.isNaN(limit) || limit < 1) {
            limit = 1;
        } else if (limit > 50) {
            limit = 50;
        }

        // Optimized ship validation with group filter
        const ship = await InvTypes.findOne({
            type_id: shipId,
            group_id: { $in: shipGroupIds },
        });

        if (!ship) {
            return { error: "Ship not found or not a valid ship type" };
        }

        // Optimized query with better date filtering and projection
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        const killmails = await Killmails.find(
            {
                "victim.ship_id": shipId,
                kill_time: { $gte: thirtyDaysAgo },
            },
            {
                _id: 0,
                killmail_id: 1,
                killmail_hash: 1,
                ship_value: 1,
                "items.type_id": 1,
                "items.flag": 1,
                "items.qty_dropped": 1,
                "items.qty_destroyed": 1,
            }
        )
            .sort({ kill_time: -1 })
            .limit(600) // Reduced limit for better performance
            .lean();

        if (killmails.length === 0) {
            return [];
        }

        // Process killmails in batches for better memory usage
        const fittingGroups: { [key: string]: IFittingGroup } = {};
        const batchSize = 30;

        for (let i = 0; i < killmails.length; i += batchSize) {
            const batch = killmails.slice(i, i + batchSize);
            const batchResults = await Promise.all(
                batch.map(async (killmail) => {
                    const fitting = await generateFitting(killmail.items);
                    const fittingCost = await generateFittingCost(fitting);
                    const filteredFitting = pruneFittingForHash(fitting);
                    const fittingHash = crypto
                        .createHash("md5")
                        .update(stableStringify(filteredFitting))
                        .digest("hex");
                    return {
                        killmail_id: killmail.killmail_id,
                        killmail_hash: killmail.killmail_hash,
                        fitting,
                        fitting_cost: fittingCost,
                        fitting_hash: fittingHash,
                        ship_value: killmail.ship_value,
                    };
                })
            );

            // Group results efficiently
            for (const result of batchResults) {
                if (!fittingGroups[result.fitting_hash]) {
                    fittingGroups[result.fitting_hash] = {
                        killmail_id: result.killmail_id,
                        killmail_hash: result.killmail_hash,
                        fitting: result.fitting,
                        fitting_cost: result.fitting_cost,
                        count: 1,
                        ship_value: result.ship_value,
                    };
                } else {
                    fittingGroups[result.fitting_hash].count++;
                }
            }
        }

        // Sort fittings and return top results
        const sortedFittings = Object.values(fittingGroups)
            .sort((a, b) => b.count - a.count)
            .slice(0, limit);

        return sortedFittings;
    },
    {
        maxAge: 1800, // Reduced from 86400 to 30 minutes
        staleMaxAge: -1,
        swr: true,
        base: "redis",
        getKey: (event) => {
            const shipId = event.context.params?.id;
            const query = getQuery(event);
            const limit = query.limit || "10";
            return `fitting-data-v2:${shipId}:${limit}`;
        },
    }
);

// Updated stableStringify to handle circular references
function stableStringify(obj: any, seen = new WeakSet()): string {
    if (obj === null || typeof obj !== "object") {
        return JSON.stringify(obj);
    }
    if (seen.has(obj)) {
        return '"[Circular]"';
    }
    seen.add(obj);
    if (Array.isArray(obj)) {
        return `[${obj.map((item) => stableStringify(item, seen)).join(",")}]`;
    }
    const keys = Object.keys(obj).sort();
    return `{${keys
        .map(
            (key) => `${JSON.stringify(key)}:${stableStringify(obj[key], seen)}`
        )
        .join(",")}}`;
}

// Optimized fitting cost calculation with batch pricing lookup
async function generateFittingCost(fitting: IFittingSlots): Promise<number> {
    // Collect all unique type IDs first
    const typeIds = new Set<number>();
    for (const slot in fitting) {
        for (const item of fitting[slot as keyof IFittingSlots]) {
            if (item.type_id) {
                typeIds.add(item.type_id);
            }
        }
    }

    if (typeIds.size === 0) return 0;

    // Single batch query for all prices
    const prices = await Prices.find({
        type_id: { $in: Array.from(typeIds) },
        region_id: 10000002,
    })
        .sort({ date: -1 })
        .lean();

    // Create efficient price lookup map
    const priceMap = new Map<number, number>();
    for (const price of prices) {
        if (!priceMap.has(price.type_id) && price.average > 0) {
            priceMap.set(price.type_id, price.average);
        }
    }

    // Calculate total cost
    let cost = 0;
    for (const slot in fitting) {
        for (const item of fitting[slot as keyof IFittingSlots]) {
            const price = priceMap.get(item.type_id) || 0;
            const quantity =
                (item.qty_dropped || 0) + (item.qty_destroyed || 0);
            cost += price * Math.max(quantity, 1);
        }
    }

    return cost;
}

async function generateFitting(items: IItem[]): Promise<IFittingSlots> {
    const fitting: IFittingSlots = {
        high_slot: [],
        medium_slot: [],
        low_slot: [],
        rig_slot: [],
        subsystem: [],
        drone_bay: [],
        fighter_bay: [],
    };

    for (const item of items) {
        if (shipGroupIds.includes(item.group_id)) {
            fitting.subsystem.push(item);
        } else if (itemSlotTypes.high_slot.includes(item.flag)) {
            fitting.high_slot.push(item);
        } else if (itemSlotTypes.medium_slot.includes(item.flag)) {
            fitting.medium_slot.push(item);
        } else if (itemSlotTypes.low_slot.includes(item.flag)) {
            fitting.low_slot.push(item);
        } else if (itemSlotTypes.rig_slot.includes(item.flag)) {
            fitting.rig_slot.push(item);
        } else if (itemSlotTypes.drone_bay.includes(item.flag)) {
            fitting.drone_bay.push(item);
        } else if (itemSlotTypes.fighter_bay.includes(item.flag)) {
            fitting.fighter_bay.push(item);
        }
    }

    // Sort each slot by type_id only (canonical order)
    for (const slot of Object.keys(fitting) as Array<keyof typeof fitting>) {
        fitting[slot].sort((a, b) => a.type_id - b.type_id);
    }

    return fitting;
}

// Helper to remove all item properties except type_id for each slot
function pruneFittingForHash(fitting: IFittingSlots): any {
    const pruned: any = {};
    for (const slot in fitting) {
        pruned[slot] = fitting[slot as keyof IFittingSlots]
            .map((item: any) => ({ type_id: item.type_id }))
            .sort((a: any, b: any) => a.type_id - b.type_id);
    }
    return pruned;
}
