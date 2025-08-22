import crypto from "node:crypto";
import formatIsk from "../../../utils/formatIsk";

// Define types for better type safety (copied from main fitting API)
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
    svg?: string;
}

// Allowed ship groups (copied from main fitting API)
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
        const limit: number = Number(query.limit || 10);

        // Ship validation - check if ship is valid
        const ship = await InvTypes.findOne(
            { type_id: shipId },
            { group_id: 1, name: 1 }
        );

        if (!ship || !shipGroupIds.includes(ship.group_id)) {
            return { error: "Invalid ship type or ship not found" };
        }

        // Get killmails for this ship and generate fittings data
        const killmails = await Killmails.find(
            { "victim.ship_id": shipId },
            { killmail_id: 1, killmail_hash: 1, items: 1, ship_value: 1 }
        )
            .sort({ kill_time: -1 })
            .limit(1000)
            .lean();

        if (killmails.length === 0) {
            return [];
        }

        // Process fittings and generate hashes
        const fittingResults = await Promise.all(
            killmails.map(async (killmail) => {
                const items = killmail.items || [];
                const fitting = await generateFitting(items);
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

        // Group the fitted results
        const fittingGroups: { [key: string]: IFittingGroup } = {};
        for (const result of fittingResults) {
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

        // Sort fittings and generate SVGs
        const sortedFittings = Object.values(fittingGroups).sort(
            (a, b) => b.count - a.count
        );
        const finalFittings = sortedFittings
            .slice(0, limit)
            .map((fit: IFittingGroup, index: number) => {
                fit.svg = generateSvg(
                    `https://images.evetech.net/types/${shipId}/render`,
                    fit.fitting_cost,
                    fit.ship_value,
                    index + 1
                );
                return fit;
            });

        return finalFittings;
    },
    {
        maxAge: 86400,
        staleMaxAge: -1,
        swr: true,
        base: "redis",
        getKey: (event) => {
            const shipId = event.context.params?.id;
            const query = getQuery(event);
            const limit = query.limit || "10";
            return `fitting-svg:${shipId}:limit:${limit}`;
        },
    }
);

// Helper functions (copied from main fitting API)
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

async function generateFittingCost(fitting: IFittingSlots): Promise<number> {
    let cost = 0;
    for (const slot in fitting) {
        for (const item of fitting[slot as keyof IFittingSlots]) {
            const price = await Prices.findOne({
                type_id: item.type_id,
                region_id: 10000002,
            }).sort({
                date: -1,
            });
            if (price?.average) {
                cost += price.average * (item.qty_dropped + item.qty_destroyed);
            }
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

function pruneFittingForHash(fitting: IFittingSlots): any {
    const pruned: any = {};
    for (const slot in fitting) {
        pruned[slot] = fitting[slot as keyof IFittingSlots]
            .map((item: any) => ({ type_id: item.type_id }))
            .sort((a: any, b: any) => a.type_id - b.type_id);
    }
    return pruned;
}

// SVG generation function
function generateSvg(
    shipImageUrl: string,
    fitCost: number,
    shipCost: number,
    rank: number
): string {
    const totalCost = fitCost + shipCost;
    return `<svg width="280" height="50" xmlns="http://www.w3.org/2000/svg">
  <image href="${shipImageUrl}" x="0" y="0" height="50" width="50"/>
  <text x="60" y="15" font-family="Arial" font-size="12" font-weight="bold" fill="white">Rank ${rank} (Total: ${formatIsk(
        totalCost
    )})</text>
  <text x="60" y="30" font-family="Arial" font-size="11" fill="white">Fit: ${formatIsk(
      fitCost
  )}</text>
  <text x="60" y="45" font-family="Arial" font-size="11" fill="white">Ship: ${formatIsk(
      shipCost
  )}</text>
</svg>`;
}
