import type { IAlliance } from "~/interfaces/IAlliance";
import type { ICharacter } from "~/interfaces/ICharacter";
import type { IConstellation } from "~/interfaces/IConstellation";
import type { ICorporation } from "~/interfaces/ICorporation";
import type { IInvType } from "~/interfaces/IInvType";
import type { IRegion } from "~/interfaces/IRegion";
import type { ISolarSystem } from "~/interfaces/ISolarSystem";
import { Killmails } from "../models/Killmails";

// Earliest known killmail is from 2007-12-05
const timeSinceEarlyDays: Date = new Date("2007-12-05T00:00:00Z");

// Optimized topCharacters: remove double grouping and use $addToSet
async function topCharacters(
  attackerType: string | null = null,
  typeId: number | null = null,
  days: number | null = 30,
  limit = 10,
) {
  let calculatedTime = timeSinceEarlyDays;
  if (days) {
    calculatedTime = new Date(Date.now() - days * 86400 * 1000);
  }

  const matchFilter: any = {
    "attackers.character_id": { $ne: 0 },
    kill_time: { $gte: calculatedTime },
  };
  if (attackerType && typeId) {
    matchFilter[`attackers.${attackerType}`] = typeId;
  }

  const query: any[] = [
    { $match: matchFilter },
    { $unwind: "$attackers" },
    {
      $group: {
        _id: "$attackers.character_id",
        killmailIds: { $addToSet: "$killmail_id" },
      },
    },
    {
      $project: {
        id: "$_id",
        count: { $size: "$killmailIds" },
      },
    },
    { $sort: { count: -1, id: 1 } },
    { $limit: limit },
  ];

  const results = await Killmails.aggregate(query, { allowDiskUse: true });

  const mappedResults = await Promise.all(
    results.map(async (character: any) => {
      const data: ICharacter | null = await Characters.findOne({ character_id: character.id });
      return {
        character_id: character.id,
        name: data?.name || "Unknown",
        count: character.count,
      };
    }),
  );

  return mappedResults;
}

// Optimized topCorporations
async function topCorporations(
  attackerType: string | null = null,
  typeId: number | null = null,
  days: number | null = 30,
  limit = 10,
) {
  let calculatedTime = timeSinceEarlyDays;
  if (days) {
    calculatedTime = new Date(Date.now() - days * 86400 * 1000);
  }

  const matchFilter: any = {
    "attackers.corporation_id": { $ne: 0 },
    kill_time: { $gte: calculatedTime },
  };
  if (attackerType && typeId) {
    matchFilter[`attackers.${attackerType}`] = typeId;
  }

  const query: any[] = [
    { $match: matchFilter },
    { $unwind: "$attackers" },
    {
      $group: {
        _id: "$attackers.corporation_id",
        killmailIds: { $addToSet: "$killmail_id" },
      },
    },
    {
      $project: {
        id: "$_id",
        count: { $size: "$killmailIds" },
      },
    },
    { $sort: { count: -1, id: 1 } },
    { $limit: limit },
  ];

  const results = await Killmails.aggregate(query, { allowDiskUse: true });

  const mappedResults = await Promise.all(
    results.map(async (corporation: any) => {
      const data: ICorporation | null = await Corporations.findOne({
        corporation_id: corporation.id,
      });
      return {
        corporation_id: corporation.id,
        name: data?.name || "Unknown",
        count: corporation.count,
      };
    }),
  );

  return mappedResults;
}

// Optimized topAlliances
async function topAlliances(
  attackerType: string | null = null,
  typeId: number | null = null,
  days: number | null = 30,
  limit = 10,
) {
  let calculatedTime = timeSinceEarlyDays;
  if (days) {
    calculatedTime = new Date(Date.now() - days * 86400 * 1000);
  }

  const matchFilter: any = {
    "attackers.alliance_id": { $ne: 0 },
    kill_time: { $gte: calculatedTime },
  };
  if (attackerType && typeId) {
    matchFilter[`attackers.${attackerType}`] = typeId;
  }

  const query: any[] = [
    { $match: matchFilter },
    { $unwind: "$attackers" },
    {
      $group: {
        _id: "$attackers.alliance_id",
        killmailIds: { $addToSet: "$killmail_id" },
      },
    },
    {
      $project: {
        id: "$_id",
        count: { $size: "$killmailIds" },
      },
    },
    { $sort: { count: -1, id: 1 } },
    { $limit: limit },
  ];

  const result = await Killmails.aggregate(query, { allowDiskUse: true });

  const mappedResults = await Promise.all(
    result.map(async (alliance: any) => {
      const data: IAlliance | null = await Alliances.findOne({ alliance_id: alliance.id });
      return {
        alliance_id: alliance.id,
        name: data?.name || "Unknown",
        count: alliance.count,
      };
    }),
  );

  return mappedResults;
}

// Optimized topSystems: system_id is a top-level field; no unwind required
async function topSystems(
  attackerType: string | null = null,
  typeId: number | null = null,
  days: number | null = 30,
  limit = 10,
) {
  let calculatedTime = timeSinceEarlyDays;
  if (days) {
    calculatedTime = new Date(Date.now() - days * 86400 * 1000);
  }

  const matchFilter: any = { kill_time: { $gte: calculatedTime } };
  if (attackerType && typeId) {
    matchFilter[`attackers.${attackerType}`] = typeId;
  }

  const query: any[] = [
    { $match: matchFilter },
    {
      $group: {
        _id: "$system_id",
        killmailIds: { $addToSet: "$killmail_id" },
      },
    },
    {
      $project: {
        id: "$_id",
        count: { $size: "$killmailIds" },
      },
    },
    { $sort: { count: -1, id: 1 } },
    { $limit: limit },
  ];

  const result = await Killmails.aggregate(query, { allowDiskUse: true });

  const mappedResults = await Promise.all(
    result.map(async (system: any) => {
      const data: ISolarSystem | null = await SolarSystems.findOne({ system_id: system.id });
      return {
        system_id: system.id,
        name: data?.system_name || "Unknown",
        count: system.count,
      };
    }),
  );

  return mappedResults;
}

// Optimized topConstellations: remove unwind, group directly on constellation_id
async function topConstellations(
  attackerType: string | null = null,
  typeId: number | null = null,
  days: number | null = 30,
  limit = 10,
) {
  let calculatedTime = new Date("2007-12-05T00:00:00Z"); // timeSinceEarlyDays
  if (days) {
    calculatedTime = new Date(Date.now() - days * 86400 * 1000);
  }

  const matchFilter: any = {
    kill_time: { $gte: calculatedTime },
    constellation_id: { $ne: null },
  };
  if (attackerType && typeId) {
    matchFilter[`attackers.${attackerType}`] = typeId;
  }

  const query: any[] = [
    { $match: matchFilter },
    {
      $group: {
        _id: "$constellation_id",
        killmailIds: { $addToSet: "$killmail_id" },
      },
    },
    {
      $project: {
        id: "$_id",
        count: { $size: "$killmailIds" },
      },
    },
    { $sort: { count: -1, id: 1 } },
    { $limit: limit },
  ];

  const result = await Killmails.aggregate(query, { allowDiskUse: true });

  const mappedResults = await Promise.all(
    result.map(async (constellation: any) => {
      const data: IConstellation | null = await Constellations.findOne({
        constellation_id: constellation.id,
      });
      return {
        constellation_id: constellation.id,
        name: data?.constellation_name || "Unknown",
        count: constellation.count,
      };
    }),
  );

  return mappedResults;
}

// Optimized topRegions: group on region_id directly
async function topRegions(
  attackerType: string | null = null,
  typeId: number | null = null,
  days: number | null = 30,
  limit = 10,
) {
  let calculatedTime = timeSinceEarlyDays;
  if (days) {
    calculatedTime = new Date(Date.now() - days * 86400 * 1000);
  }

  const matchFilter: any = { kill_time: { $gte: calculatedTime } };
  if (attackerType && typeId) {
    matchFilter[`attackers.${attackerType}`] = typeId;
  }

  const query: any[] = [
    { $match: matchFilter },
    {
      $group: {
        _id: "$region_id",
        killmailIds: { $addToSet: "$killmail_id" },
      },
    },
    {
      $project: {
        id: "$_id",
        count: { $size: "$killmailIds" },
      },
    },
    { $sort: { count: -1, id: 1 } },
    { $limit: limit },
  ];

  const result = await Killmails.aggregate(query, { allowDiskUse: true });

  const mappedResults = await Promise.all(
    result.map(async (region: any) => {
      const data: IRegion | null = await Regions.findOne({ region_id: region.id });
      return {
        region_id: data?.region_id || 0,
        name: data?.region_name || "Unknown",
        count: region.count,
      };
    }),
  );

  return mappedResults;
}

// Optimized topShips: still require unwind on attackers
async function topShips(
  attackerType: string | null = null,
  typeId: number | null = null,
  days: number | null = 30,
  limit = 10,
) {
  let calculatedTime = timeSinceEarlyDays;
  if (days) {
    calculatedTime = new Date(Date.now() - days * 86400 * 1000);
  }

  const matchFilter: any = {
    kill_time: { $gte: calculatedTime },
    "attackers.ship_id": { $nin: [0, 670] },
  };
  if (attackerType && typeId) {
    matchFilter[`attackers.${attackerType}`] = typeId;
  }

  const query: any[] = [
    { $match: matchFilter },
    { $unwind: "$attackers" },
    { $match: { "attackers.ship_id": { $nin: [0, 670] } } },
    {
      $group: {
        _id: "$attackers.ship_id",
        killmailIds: { $addToSet: "$killmail_id" },
      },
    },
    {
      $project: {
        id: "$_id",
        count: { $size: "$killmailIds" },
      },
    },
    { $sort: { count: -1, id: 1 } },
    { $limit: limit },
  ];

  const result = await Killmails.aggregate(query, { allowDiskUse: true });

  const mappedResults = await Promise.all(
    result.map(async (ship: any) => {
      const data: IInvType | null = await InvTypes.findOne({ type_id: ship.id });
      return {
        type_id: ship.id,
        name: data?.name || "Unknown",
        count: ship.count,
      };
    }),
  );

  return mappedResults;
}

// Optimized topSolo: use $addToSet after filtering final_blow
async function topSolo(
  attackerType: string | null = null,
  typeId: number | null = null,
  days: number | null = 30,
  limit = 10,
) {
  let calculatedTime = timeSinceEarlyDays;
  if (days) {
    calculatedTime = new Date(Date.now() - days * 86400 * 1000);
  }

  const matchFilter: any = {
    is_solo: true,
    kill_time: { $gte: calculatedTime },
  };
  if (attackerType && typeId) {
    matchFilter[`attackers.${attackerType}`] = typeId;
  }

  const query: any[] = [
    { $match: matchFilter },
    { $unwind: "$attackers" },
    { $match: { "attackers.final_blow": true } },
    {
      $group: {
        _id: "$attackers.character_id",
        killmailIds: { $addToSet: "$killmail_id" },
      },
    },
    {
      $project: {
        id: "$_id",
        count: { $size: "$killmailIds" },
      },
    },
    { $sort: { count: -1, id: 1 } },
    { $limit: limit },
  ];

  return await Killmails.aggregate(query, { allowDiskUse: true });
}

async function mostValuableKills(days: number | null = 7, limit = 10) {
  let calculatedTime = timeSinceEarlyDays;
  if (days) {
    calculatedTime = new Date(Date.now() - days * 86400 * 1000);
  }

  return (
    await Killmails.find({ kill_time: { $gte: calculatedTime } }, { _id: 0 })
      .sort({ total_value: -1 })
      .limit(limit)
  ).map((killmail: any) => {
    return {
      killmail_id: killmail.killmail_id,
      total_value: killmail.total_value,
      victim: {
        ship_id: killmail.victim.ship_id,
        ship_name: killmail.victim.ship_name,
      },
    };
  });
}

async function mostValuableStructures(days: number | null = 7, limit = 10) {
  let calculatedTime = timeSinceEarlyDays;
  if (days) {
    calculatedTime = new Date(Date.now() - days * 86400 * 1000);
  }
  const structureGroupIDs = [1657, 1406, 1404, 1408, 2017, 2016];

  return (
    await Killmails.find(
      { kill_time: { $gte: calculatedTime }, "victim.ship_group_id": { $in: structureGroupIDs } },
      { _id: 0 },
    )
      .sort({ total_value: -1 })
      .limit(limit)
  ).map((killmail: any) => {
    return {
      killmail_id: killmail.killmail_id,
      total_value: killmail.total_value,
      victim: {
        ship_id: killmail.victim.ship_id,
        ship_name: killmail.victim.ship_name,
      },
    };
  });
}

async function mostValuableShips(days: number | null = 7, limit = 10) {
  let calculatedTime = timeSinceEarlyDays;
  if (days) {
    calculatedTime = new Date(Date.now() - days * 86400 * 1000);
  }

  const shipGroupIDs = [
    547, 485, 513, 902, 941, 30, 659, 419, 27, 29, 26, 420, 25, 28, 463, 237, 31, 324, 898, 906,
    540, 830, 893, 543, 541, 833, 358, 894, 831, 832, 900, 834, 380, 963, 1305,
  ];

  return (
    await Killmails.find(
      { kill_time: { $gte: calculatedTime }, "victim.ship_group_id": { $in: shipGroupIDs } },
      { _id: 0 },
    )
      .sort({ total_value: -1 })
      .limit(limit)
  ).map((killmail: any) => {
    return {
      killmail_id: killmail.killmail_id,
      total_value: killmail.total_value,
      victim: {
        ship_id: killmail.victim.ship_id,
        ship_name: killmail.victim.ship_name,
      },
    };
  });
}

async function killCount(days: number | null = 7) {
  let calculatedTime = timeSinceEarlyDays;
  if (days) {
    calculatedTime = new Date(Date.now() - days * 86400 * 1000);
  }

  const query: any[] = [{ $match: { kill_time: { $gte: calculatedTime } } }, { $count: "count" }];

  return await Killmails.aggregate(query, { allowDiskUse: true });
}

async function newCharacters() {
  const thresholdDate = new Date("2003-01-01T00:00:00Z");

  const query: any[] = [
    {
      $match: {
        birthday: { $gte: thresholdDate },
      },
    },
    {
      $group: {
        _id: {
          year: { $year: "$birthday" },
          month: { $month: "$birthday" },
          day: { $dayOfMonth: "$birthday" },
        },
        count: { $sum: 1 },
      },
    },
    { $sort: { "_id.year": 1, "_id.month": 1, "_id.day": 1 } },
  ];

  return await Characters.aggregate(query, { allowDiskUse: true });
}

export {
  topCharacters,
  topCorporations,
  topAlliances,
  topSystems,
  topConstellations,
  topRegions,
  topShips,
  topSolo,
  mostValuableKills,
  mostValuableStructures,
  mostValuableShips,
  killCount,
  newCharacters,
};
