import crypto from "node:crypto";
import type { IItem } from "~/interfaces/IKillmail";

// Allowed ship groups
const shipGroupIds = [
  25, 26, 27, 28, 29, 30, 31, 237, 324, 358, 380, 381, 419, 420, 463, 485, 513, 540, 541, 543, 547,
  659, 830, 831, 832, 833, 834, 883, 893, 894, 898, 900, 902, 906, 941, 963, 1022, 1201, 1202, 1283,
  1305, 1527, 1534, 1538, 1972, 2001, 4594,
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

export default defineEventHandler(async (event) => {
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

  const ship = await InvTypes.findOne({ type_id: shipId });
  if (!ship) {
    return { error: "Ship not found" };
  }

  // Ensure it's a ship, meaning the group_id is in the allowed list
  const shipGroupId = ship.group_id;
  if (!shipGroupIds.includes(shipGroupId)) {
    return { error: "Not a ship type" };
  }

  // Find killmails in the last 30 days where the ship was destroyed
  const killmails = await Killmails.find(
    {
      kill_time: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), $lte: new Date() },
      "victim.ship_id": shipId,
    },
    {
      _id: 0,
      "items.type_id": 1,
      "items.name": 1,
      "items.group_id": 1,
      "items.group_name": 1,
      "items.flag": 1,
      "items.qty_dropped": 1,
      "items.qty_destroyed": 1,
      killmail_id: 1,
      killmail_hash: 1,
      total_value: 1,
      ship_value: 1,
    },
  );

  // Process killmails concurrently
  const fittingResults = await Promise.all(
    killmails.map(async (killmail) => {
      const fitting = await generateFitting(killmail.items);
      const fittingCost = await generateFittingCost(fitting);
      // Prune fitting for hash: only keep slot and type_id
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
    }),
  );

  // Group the fitted results, propagating total_value and ship_value from first occurrence
  const fittings = {};
  const fittingGroups = {};
  for (const result of fittingResults) {
    fittings[result.killmail_id] = result;
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

  // Sort fittings and attach SVG using DB values
  const sortedFittings = Object.values(fittingGroups).sort((a, b) => b.count - a.count);
  const finalFittings = sortedFittings.slice(0, limit).map((fit: any, index: number) => {
    // Derive fit cost (fit portion) from DB: total_value = fit cost + ship cost.
    // Pass derived fitCost and shipCost to SVG generator
    fit.svg = generateSvg(
      `https://images.evetech.net/types/${shipId}/render`,
      fit.fitting_cost,
      fit.ship_value,
      index + 1,
    );
    return fit;
  });
  return finalFittings;
});

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
  return `{${keys.map((key) => `${JSON.stringify(key)}:${stableStringify(obj[key], seen)}`).join(",")}}`;
}

async function generateFittingCost(fitting: any): Promise<number> {
  let cost = 0;
  for (const slot in fitting) {
    for (const item of fitting[slot]) {
      const price = await Prices.findOne({ type_id: item.type_id, region_id: 10000002 }).sort({
        date: -1,
      });
      if (price?.average) {
        cost += price.average * (item.qty_dropped + item.qty_destroyed);
      }
    }
  }
  return cost;
}

async function generateFitting(items: IItem[]) {
  const fitting = {
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
function pruneFittingForHash(fitting: any): any {
  const pruned: any = {};
  for (const slot in fitting) {
    pruned[slot] = fitting[slot]
      .map((item: any) => ({ type_id: item.type_id }))
      .sort((a: any, b: any) => a.type_id - b.type_id);
  }
  return pruned;
}

// New helper to generate an SVG from fit properties.
function generateSvg(
  shipImageUrl: string,
  fitCost: number,
  shipCost: number,
  rank: number,
): string {
  const totalCost = fitCost + shipCost;
  return `<svg width="300" height="60" xmlns="http://www.w3.org/2000/svg">
  <image href="${shipImageUrl}" x="0" y="0" height="60" width="60"/>
  <text x="70" y="15" font-family="Arial" font-size="12" fill="white">Rank: ${rank}</text>
  <text x="70" y="30" font-family="Arial" font-size="12" fill="white">Fit Cost: ${formatNumber(Number(fitCost.toFixed(2)))} ISK</text>
  <text x="70" y="45" font-family="Arial" font-size="12" fill="white">Ship Cost: ${formatNumber(Number(shipCost.toFixed(2)))} ISK</text>
  <text x="70" y="60" font-family="Arial" font-size="12" fill="white">Total Cost: ${formatNumber(Number(totalCost.toFixed(2)))} ISK</text>
</svg>`;
}

function formatNumber(value: number, decimals = 2): string {
  return new Intl.NumberFormat(undefined, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}
