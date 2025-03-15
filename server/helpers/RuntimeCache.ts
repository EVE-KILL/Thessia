import { LRUCache } from "lru-cache";
import type { IAlliance } from "~/interfaces/IAlliance";
import type { ICharacter } from "~/interfaces/ICharacter";
import type { IConstellation } from "~/interfaces/IConstellation";
import type { ICorporation } from "~/interfaces/ICorporation";
import type { ICustomPrice } from "~/interfaces/ICustomPrice";
import type { IFaction } from "~/interfaces/IFaction";
import type { IInvFlag } from "~/interfaces/IInvFlag";
import type { IInvGroup } from "~/interfaces/IInvGroup";
import type { IInvType } from "~/interfaces/IInvType";
import type { IRegion } from "~/interfaces/IRegion";
import type { ISolarSystem } from "~/interfaces/ISolarSystem";
import { Constellations } from "../models/Constellations";
import { CustomPrices } from "../models/CustomPrices";
import { Factions } from "../models/Factions";
import { InvFlags } from "../models/InvFlags";
import { InvGroups } from "../models/InvGroups";
import { InvTypes } from "../models/InvTypes";
import { Regions } from "../models/Regions";
import { SolarSystems } from "../models/SolarSystems";
import { getAlliance, getCharacter, getCorporation } from "./ESIData";
import { getPrice } from "./Prices";

export const invGroupsCache = new Map<number, IInvGroup>();
export const invTypesCache = new Map<number, IInvType>();
export const invFlagsCache = new Map<number, IInvFlag>();
export const factionsCache = new Map<number, IFaction>();
export const regionsCache = new Map<number, IRegion>();
export const constellationsCache = new Map<number, IConstellation>();
export const solarSystemsCache = new Map<number, ISolarSystem>();
export const customPriceCache = new Map<number, ICustomPrice>();
export const priceCache = new LRUCache<string, number>({
  max: 1000000,
  ttl: 1000 * 60 * 60 * 24,
  allowStale: true,
});
export const characterCache = new LRUCache<string, ICharacter>({
  max: 100000,
  ttl: 1000 * 60 * 60 * 6,
  allowStale: true,
});
export const corporationCache = new LRUCache<string, ICorporation>({
  max: 100000,
  ttl: 1000 * 60 * 60 * 6,
  allowStale: true,
});
export const allianceCache = new LRUCache<string, IAlliance>({
  max: 100000,
  ttl: 1000 * 60 * 60 * 6,
  allowStale: true,
});
export const nearCache = new LRUCache<string, any>({
  max: 500000,
  ttl: 1000 * 60 * 60 * 1,
  allowStale: true,
});

export const cacheHits = {
  invGroups: 0,
  invTypes: 0,
  invFlags: 0,
  factions: 0,
  regions: 0,
  constellations: 0,
  solarSystems: 0,
  price: 0,
  character: 0,
  corporation: 0,
  alliance: 0,
  near: 0,
};

async function loadAllInvGroups(): Promise<void> {
  const groups = await InvGroups.find({});
  for (const group of groups) {
    invGroupsCache.set(group.group_id, group);
  }
}
async function loadAllInvTypes(): Promise<void> {
  const types = await InvTypes.find({});
  for (const type of types) {
    invTypesCache.set(type.type_id, type);
  }
}
async function loadAllInvFlags(): Promise<void> {
  const flags = await InvFlags.find({});
  for (const flag of flags) {
    invFlagsCache.set(flag.flag_id, flag);
  }
}
async function loadAllFactions(): Promise<void> {
  const factions = await Factions.find({});
  for (const faction of factions) {
    factionsCache.set(faction.faction_id, faction);
  }
}
async function loadAllRegions(): Promise<void> {
  const regions = await Regions.find({});
  for (const region of regions) {
    regionsCache.set(region.region_id, region);
  }
}
async function loadAllConstellations(): Promise<void> {
  const constellations = await Constellations.find({});
  for (const constellation of constellations) {
    constellationsCache.set(constellation.constellation_id, constellation);
  }
}
async function loadAllSolarSystems(): Promise<void> {
  const solarSystems = await SolarSystems.find({});
  for (const solarSystem of solarSystems) {
    solarSystemsCache.set(solarSystem.system_id, solarSystem);
  }
}
async function loadAllCustomPrices(): Promise<void> {
  const prices = await CustomPrices.find({}).sort({ date: 1 });
  for (const price of prices) {
    customPriceCache.set(price.type_id, price);
  }
}

// useRuntimeConfig() exists only in nitro, so the ./bin/console job will fail, check if it exists before using it
// If it exists, check if useRuntimeConfig().enabledRunTimeCache is true
if (
  typeof useRuntimeConfig === "function" &&
  useRuntimeConfig()?.enabledRunTimeCache &&
  process.env.NODE_ENV === "production"
) {
  // Load at startup
  await Promise.all([
    loadAllInvGroups(),
    loadAllInvTypes(),
    loadAllInvFlags(),
    loadAllFactions(),
    loadAllRegions(),
    loadAllConstellations(),
    loadAllSolarSystems(),
    loadAllCustomPrices(),
  ]);
  console.log(
    "ℹ️  Runtime caches loaded",
    `invGroups: ${invGroupsCache.size}`,
    `invTypes: ${invTypesCache.size}`,
    `invFlags: ${invFlagsCache.size}`,
    `factions: ${factionsCache.size}`,
    `regions: ${regionsCache.size}`,
    `constellations: ${constellationsCache.size}`,
    `solarSystems: ${solarSystemsCache.size}`,
    `customPrices: ${customPriceCache.size}`,
  );

  setInterval(loadAllInvGroups, 1000 * 60 * 60);
  setInterval(loadAllInvTypes, 1000 * 60 * 60);
  setInterval(loadAllInvFlags, 1000 * 60 * 60);
  setInterval(loadAllFactions, 1000 * 60 * 60);
  setInterval(loadAllRegions, 1000 * 60 * 60);
  setInterval(loadAllConstellations, 1000 * 60 * 60);
  setInterval(loadAllSolarSystems, 1000 * 60 * 60);
  setInterval(loadAllCustomPrices, 1000 * 60 * 60);
}

export async function getCachedInvGroup(groupId: number): Promise<IInvGroup | null> {
  if (invGroupsCache.has(groupId)) {
    cacheHits.invGroups++;
    return invGroupsCache.get(groupId) as IInvGroup | null;
  }
  const group = await InvGroups.findOne({ group_id: groupId });
  if (group) invGroupsCache.set(groupId, group);
  return group;
}

export async function getCachedItem(typeId: number): Promise<IInvType | null> {
  if (invTypesCache.has(typeId)) {
    cacheHits.invTypes++;
    return invTypesCache.get(typeId) as IInvType | null;
  }
  const type = await InvTypes.findOne({ type_id: typeId });
  if (type) invTypesCache.set(typeId, type);
  return type;
}

export async function getCachedInvFlag(flagId: number): Promise<IInvFlag | null> {
  if (invFlagsCache.has(flagId)) {
    cacheHits.invFlags++;
    return invFlagsCache.get(flagId) as IInvFlag | null;
  }
  const flag = await InvFlags.findOne({ flag_id: flagId });
  if (flag) invFlagsCache.set(flagId, flag);
  return flag;
}

export async function getCachedFaction(factionId: number): Promise<IFaction | null> {
  if (factionsCache.has(factionId)) {
    cacheHits.factions++;
    return factionsCache.get(factionId) as IFaction | null;
  }
  const faction = await Factions.findOne({ faction_id: factionId });
  if (faction) factionsCache.set(factionId, faction);
  return faction;
}

export async function getCachedRegion(regionId: number): Promise<IRegion | null> {
  if (regionsCache.has(regionId)) {
    cacheHits.regions++;
    return regionsCache.get(regionId) as IRegion | null;
  }
  const region = await Regions.findOne({ region_id: regionId });
  if (region) regionsCache.set(regionId, region);
  return region;
}

export async function getCachedConstellation(
  constellationId: number,
): Promise<IConstellation | null> {
  if (constellationsCache.has(constellationId)) {
    cacheHits.constellations++;
    return constellationsCache.get(constellationId) as IConstellation | null;
  }
  const constellation = await Constellations.findOne({ constellation_id: constellationId });
  if (constellation) constellationsCache.set(constellationId, constellation);
  return constellation;
}

export async function getCachedSolarSystem(solarSystemId: number): Promise<ISolarSystem | null> {
  if (solarSystemsCache.has(solarSystemId)) {
    cacheHits.solarSystems++;
    return solarSystemsCache.get(solarSystemId) as ISolarSystem | null;
  }
  const solarSystem = await SolarSystems.findOne({ system_id: solarSystemId });
  if (solarSystem) solarSystemsCache.set(solarSystemId, solarSystem);
  return solarSystem;
}

export async function getCachedCharacter(characterId: number): Promise<ICharacter | null> {
  const key = String(characterId);
  if (characterCache.has(key)) {
    cacheHits.character++;
    return characterCache.get(key) as ICharacter | null;
  }
  const character = await getCharacter(characterId);
  if (character) characterCache.set(key, character);
  return character;
}

export async function getCachedCorporation(corporationId: number): Promise<ICorporation | null> {
  const key = String(corporationId);
  if (corporationCache.has(key)) {
    cacheHits.corporation++;
    return corporationCache.get(key) as ICorporation | null;
  }
  const corp = await getCorporation(corporationId);
  if (corp) corporationCache.set(key, corp);
  return corp;
}

export async function getCachedAlliance(allianceId: number): Promise<IAlliance | null> {
  const key = String(allianceId);
  if (allianceCache.has(key)) {
    cacheHits.alliance++;
    return allianceCache.get(key) as IAlliance | null;
  }
  const alliance = await getAlliance(allianceId);
  if (alliance) allianceCache.set(key, alliance);
  return alliance;
}

export async function getCachedPrice(typeId: number, killTime: Date): Promise<number> {
  const key = `${typeId}-${killTime.getTime()}`;
  if (priceCache.has(key)) {
    cacheHits.price++;
    return priceCache.get(key) as number | undefined;
  }
  const price = await getPrice(typeId, killTime);
  if (price) priceCache.set(key, price);
  return price;
}
