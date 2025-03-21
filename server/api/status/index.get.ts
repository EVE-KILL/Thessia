import os from "node:os";
import { MetricsTime } from "bullmq";
import { createQueue } from "../../helpers/Queue";
import {
    CACHE_NAMESPACES,
    getCacheSize,
    getCacheHitCount
} from "../../helpers/RuntimeCache";

const startTime = new Date();
export default defineEventHandler(async () => {
  const allianceQueue = createQueue("alliance");
  const corporationQueue = createQueue("corporation");
  const characterQueue = createQueue("character");
  const characterHistoryQueue = createQueue("characterhistory");
  const corporationHistoryQueue = createQueue("corporationhistory");
  const killmailQueue = createQueue("killmail");
  const warQueue = createQueue("war");

  const [
    allianceQueueCount,
    corporationQueueCount,
    characterQueueCount,
    characterHistoryQueueCount,
    corporationHistoryQueueCount,
    killmailQueueCount,
    warQueueCount,
    allianceCount,
    celestialCount,
    characterCount,
    commentCount,
    constellationCount,
    customPriceCount,
    factionCount,
    invFlagCount,
    invGroupCount,
    invTypeCount,
    killmailCount,
    esiKillmailCount,
    priceCount,
    regionCount,
    solarSystemsCount,
    userCount,
    warCount,
  ] = await Promise.all([
    allianceQueue.count(),
    corporationQueue.count(),
    characterQueue.count(),
    characterHistoryQueue.count(),
    corporationHistoryQueue.count(),
    killmailQueue.count(),
    warQueue.count(),
    Alliances.estimatedDocumentCount(),
    Celestials.estimatedDocumentCount(),
    Characters.estimatedDocumentCount(),
    Comments.estimatedDocumentCount(),
    Constellations.estimatedDocumentCount(),
    CustomPrices.estimatedDocumentCount(),
    Factions.estimatedDocumentCount(),
    InvFlags.estimatedDocumentCount(),
    InvGroups.estimatedDocumentCount(),
    InvTypes.estimatedDocumentCount(),
    Killmails.estimatedDocumentCount(),
    KillmailsESI.estimatedDocumentCount(),
    Prices.estimatedDocumentCount(),
    Regions.estimatedDocumentCount(),
    SolarSystems.estimatedDocumentCount(),
    Users.estimatedDocumentCount(),
    Wars.estimatedDocumentCount(),
  ]);

  // Get cache sizes and hits directly from Redis
  const cacheStats = await Promise.all([
    // Cache sizes
    getCacheSize(CACHE_NAMESPACES.SOLAR_SYSTEMS),
    getCacheSize(CACHE_NAMESPACES.REGIONS),
    getCacheSize(CACHE_NAMESPACES.CONSTELLATIONS),
    getCacheSize(CACHE_NAMESPACES.CUSTOM_PRICES),
    getCacheSize(CACHE_NAMESPACES.INV_GROUPS),
    getCacheSize(CACHE_NAMESPACES.INV_FLAGS),
    getCacheSize(CACHE_NAMESPACES.INV_TYPES),
    getCacheSize(CACHE_NAMESPACES.FACTIONS),
    getCacheSize(CACHE_NAMESPACES.PRICE),
    getCacheSize(CACHE_NAMESPACES.CHARACTER),
    getCacheSize(CACHE_NAMESPACES.CORPORATION),
    getCacheSize(CACHE_NAMESPACES.ALLIANCE),
    // Hit counters
    getCacheHitCount(CACHE_NAMESPACES.INV_GROUPS),
    getCacheHitCount(CACHE_NAMESPACES.INV_TYPES),
    getCacheHitCount(CACHE_NAMESPACES.INV_FLAGS),
    getCacheHitCount(CACHE_NAMESPACES.FACTIONS),
    getCacheHitCount(CACHE_NAMESPACES.REGIONS),
    getCacheHitCount(CACHE_NAMESPACES.CONSTELLATIONS),
    getCacheHitCount(CACHE_NAMESPACES.SOLAR_SYSTEMS),
    getCacheHitCount(CACHE_NAMESPACES.PRICE),
    getCacheHitCount(CACHE_NAMESPACES.CHARACTER),
    getCacheHitCount(CACHE_NAMESPACES.CORPORATION),
    getCacheHitCount(CACHE_NAMESPACES.ALLIANCE)
  ]);

  // No more formatting here - return raw numbers
  const cacheHits = {
    invGroups: cacheStats[12],
    invTypes: cacheStats[13],
    invFlags: cacheStats[14],
    factions: cacheStats[15],
    regions: cacheStats[16],
    constellations: cacheStats[17],
    solarSystems: cacheStats[18],
    price: cacheStats[19],
    character: cacheStats[20],
    corporation: cacheStats[21],
    alliance: cacheStats[22]
  };

  return {
    uptime: Math.floor(process.uptime()),
    upSince: startTime,
    localTime: new Date(),
    env: {
      nodeEnv: process.env.NODE_ENV,
      nodeVersion: process.version,
      processName: process.title,
    },
    operatingSystem: {
      systemPlatform: process.platform,
      systemArch: process.arch,
      loadAvg: os.loadavg().map((avg) => parseFloat(avg.toFixed(2))),
      totalCPUs: os.cpus().length,
      totalMemoryGB: Math.floor(os.totalmem() / 1024 / 1024 / 1024),
    },
    queueCounts: {
      alliance: allianceQueueCount,
      corporation: corporationQueueCount,
      character: characterQueueCount,
      characterhistory: characterHistoryQueueCount,
      corporationhistory: corporationHistoryQueueCount,
      killmail: killmailQueueCount,
      war: warQueueCount,
    },
    processedCounts: {
      killmails: {
        "1min": Number((await killmailQueue.getMetrics("completed", 0, MetricsTime.ONE_MINUTE)).data[0]) || 0,
        "5min": Number((await killmailQueue.getMetrics("completed", 0, MetricsTime.FIVE_MINUTES)).data
          .slice(1)
          .reduce((acc, cur) => Number(acc) + Number(cur), 0)),
        "15min": Number((await killmailQueue.getMetrics("completed", 0, MetricsTime.FIFTEEN_MINUTES)).data
          .slice(1)
          .reduce((acc, cur) => Number(acc) + Number(cur), 0)),
        "1hour": Number((await killmailQueue.getMetrics("completed", 0, MetricsTime.ONE_HOUR)).data
          .slice(1)
          .reduce((acc, cur) => Number(acc) + Number(cur), 0)),
        "6hours": Number((await killmailQueue.getMetrics("completed", 0, MetricsTime.ONE_HOUR * 6)).data
          .slice(1)
          .reduce((acc, cur) => Number(acc) + Number(cur), 0)),
        "12hours": Number((await killmailQueue.getMetrics("completed", 0, MetricsTime.ONE_HOUR * 12)).data
          .slice(1)
          .reduce((acc, cur) => Number(acc) + Number(cur), 0)),
        "24hours": Number((await killmailQueue.getMetrics("completed", 0, MetricsTime.ONE_HOUR * 24)).data
          .slice(1)
          .reduce((acc, cur) => Number(acc) + Number(cur), 0)),
        "1week": Number((await killmailQueue.getMetrics("completed", 0, MetricsTime.ONE_HOUR * 24 * 7)).data
          .slice(1)
          .reduce((acc, cur) => Number(acc) + Number(cur), 0)),
        "1month": Number((await killmailQueue.getMetrics("completed", 0, MetricsTime.ONE_MONTH)).data
          .slice(1)
          .reduce((acc, cur) => Number(acc) + Number(cur), 0)),
      },
      alliances: {
        "1min": Number((await allianceQueue.getMetrics("completed", 0, MetricsTime.ONE_MINUTE)).data[0]) || 0,
        "5min": Number((await allianceQueue.getMetrics("completed", 0, MetricsTime.FIVE_MINUTES)).data
          .slice(1)
          .reduce((acc, cur) => Number(acc) + Number(cur), 0)),
        "15min": Number((await allianceQueue.getMetrics("completed", 0, MetricsTime.FIFTEEN_MINUTES)).data
          .slice(1)
          .reduce((acc, cur) => Number(acc) + Number(cur), 0)),
        "1hour": Number((await allianceQueue.getMetrics("completed", 0, MetricsTime.ONE_HOUR)).data
          .slice(1)
          .reduce((acc, cur) => Number(acc) + Number(cur), 0)),
        "6hours": Number((await allianceQueue.getMetrics("completed", 0, MetricsTime.ONE_HOUR * 6)).data
          .slice(1)
          .reduce((acc, cur) => Number(acc) + Number(cur), 0)),
        "12hours": Number((await allianceQueue.getMetrics("completed", 0, MetricsTime.ONE_HOUR * 12)).data
          .slice(1)
          .reduce((acc, cur) => Number(acc) + Number(cur), 0)),
        "24hours": Number((await allianceQueue.getMetrics("completed", 0, MetricsTime.ONE_HOUR * 24)).data
          .slice(1)
          .reduce((acc, cur) => Number(acc) + Number(cur), 0)),
        "1week": Number((await allianceQueue.getMetrics("completed", 0, MetricsTime.ONE_HOUR * 24 * 7)).data
          .slice(1)
          .reduce((acc, cur) => Number(acc) + Number(cur), 0)),
        "1month": Number((await allianceQueue.getMetrics("completed", 0, MetricsTime.ONE_MONTH)).data
          .slice(1)
          .reduce((acc, cur) => Number(acc) + Number(cur), 0)),
      },
      corporations: {
        "1min": Number((await corporationQueue.getMetrics("completed", 0, MetricsTime.ONE_MINUTE)).data[0]) || 0,
        "5min": Number((await corporationQueue.getMetrics("completed", 0, MetricsTime.FIVE_MINUTES)).data
          .slice(1)
          .reduce((acc, cur) => Number(acc) + Number(cur), 0)),
        "15min": Number((await corporationQueue.getMetrics("completed", 0, MetricsTime.FIFTEEN_MINUTES)).data
          .slice(1)
          .reduce((acc, cur) => Number(acc) + Number(cur), 0)),
        "1hour": Number((await corporationQueue.getMetrics("completed", 0, MetricsTime.ONE_HOUR)).data
          .slice(1)
          .reduce((acc, cur) => Number(acc) + Number(cur), 0)),
        "6hours": Number((await corporationQueue.getMetrics("completed", 0, MetricsTime.ONE_HOUR * 6)).data
          .slice(1)
          .reduce((acc, cur) => Number(acc) + Number(cur), 0)),
        "12hours": Number((await corporationQueue.getMetrics("completed", 0, MetricsTime.ONE_HOUR * 12)).data
          .slice(1)
          .reduce((acc, cur) => Number(acc) + Number(cur), 0)),
        "24hours": Number((await corporationQueue.getMetrics("completed", 0, MetricsTime.ONE_HOUR * 24)).data
          .slice(1)
          .reduce((acc, cur) => Number(acc) + Number(cur), 0)),
        "1week": Number((await corporationQueue.getMetrics("completed", 0, MetricsTime.ONE_HOUR * 24 * 7)).data
          .slice(1)
          .reduce((acc, cur) => Number(acc) + Number(cur), 0)),
        "1month": Number((await corporationQueue.getMetrics("completed", 0, MetricsTime.ONE_MONTH)).data
          .slice(1)
          .reduce((acc, cur) => Number(acc) + Number(cur), 0)),
      },
      characters: {
        "1min": Number((await characterQueue.getMetrics("completed", 0, MetricsTime.ONE_MINUTE)).data[0]) || 0,
        "5min": Number((await characterQueue.getMetrics("completed", 0, MetricsTime.FIVE_MINUTES)).data
          .slice(1)
          .reduce((acc, cur) => Number(acc) + Number(cur), 0)),
        "15min": Number((await characterQueue.getMetrics("completed", 0, MetricsTime.FIFTEEN_MINUTES)).data
          .slice(1)
          .reduce((acc, cur) => Number(acc) + Number(cur), 0)),
        "1hour": Number((await characterQueue.getMetrics("completed", 0, MetricsTime.ONE_HOUR)).data
          .slice(1)
          .reduce((acc, cur) => Number(acc) + Number(cur), 0)),
        "6hours": Number((await characterQueue.getMetrics("completed", 0, MetricsTime.ONE_HOUR * 6)).data
          .slice(1)
          .reduce((acc, cur) => Number(acc) + Number(cur), 0)),
        "12hours": Number((await characterQueue.getMetrics("completed", 0, MetricsTime.ONE_HOUR * 12)).data
          .slice(1)
          .reduce((acc, cur) => Number(acc) + Number(cur), 0)),
        "24hours": Number((await characterQueue.getMetrics("completed", 0, MetricsTime.ONE_HOUR * 24)).data
          .slice(1)
          .reduce((acc, cur) => Number(acc) + Number(cur), 0)),
        "1week": Number((await characterQueue.getMetrics("completed", 0, MetricsTime.ONE_HOUR * 24 * 7)).data
          .slice(1)
          .reduce((acc, cur) => Number(acc) + Number(cur), 0)),
        "1month": Number((await characterQueue.getMetrics("completed", 0, MetricsTime.ONE_MONTH)).data
          .slice(1)
          .reduce((acc, cur) => Number(acc) + Number(cur), 0)),
      },
      characterhistory: {
        "1min": Number((await characterHistoryQueue.getMetrics("completed", 0, MetricsTime.ONE_MINUTE)).data[0]) || 0,
        "5min": Number((await characterHistoryQueue.getMetrics("completed", 0, MetricsTime.FIVE_MINUTES)).data
          .slice(1)
          .reduce((acc, cur) => Number(acc) + Number(cur), 0)),
        "15min": Number((await characterHistoryQueue.getMetrics("completed", 0, MetricsTime.FIFTEEN_MINUTES)).data
          .slice(1)
          .reduce((acc, cur) => Number(acc) + Number(cur), 0)),
        "1hour": Number((await characterHistoryQueue.getMetrics("completed", 0, MetricsTime.ONE_HOUR)).data
          .slice(1)
          .reduce((acc, cur) => Number(acc) + Number(cur), 0)),
        "6hours": Number((await characterHistoryQueue.getMetrics("completed", 0, MetricsTime.ONE_HOUR * 6)).data
          .slice(1)
          .reduce((acc, cur) => Number(acc) + Number(cur), 0)),
        "12hours": Number((await characterHistoryQueue.getMetrics("completed", 0, MetricsTime.ONE_HOUR * 12)).data
          .slice(1)
          .reduce((acc, cur) => Number(acc) + Number(cur), 0)),
        "24hours": Number((await characterHistoryQueue.getMetrics("completed", 0, MetricsTime.ONE_HOUR * 24)).data
          .slice(1)
          .reduce((acc, cur) => Number(acc) + Number(cur), 0)),
        "1week": Number((await characterHistoryQueue.getMetrics("completed", 0, MetricsTime.ONE_HOUR * 24 * 7)).data
          .slice(1)
          .reduce((acc, cur) => Number(acc) + Number(cur), 0)),
        "1month": Number((await characterHistoryQueue.getMetrics("completed", 0, MetricsTime.ONE_MONTH)).data
          .slice(1)
          .reduce((acc, cur) => Number(acc) + Number(cur), 0)),
      },
      corporationhistory: {
        "1min": Number((await corporationHistoryQueue.getMetrics("completed", 0, MetricsTime.ONE_MINUTE)).data[0]) || 0,
        "5min": Number((await corporationHistoryQueue.getMetrics("completed", 0, MetricsTime.FIVE_MINUTES)).data
          .slice(1)
          .reduce((acc, cur) => Number(acc) + Number(cur), 0)),
        "15min": Number((await corporationHistoryQueue.getMetrics("completed", 0, MetricsTime.FIFTEEN_MINUTES)).data
          .slice(1)
          .reduce((acc, cur) => Number(acc) + Number(cur), 0)),
        "1hour": Number((await corporationHistoryQueue.getMetrics("completed", 0, MetricsTime.ONE_HOUR)).data
          .slice(1)
          .reduce((acc, cur) => Number(acc) + Number(cur), 0)),
        "6hours": Number((await corporationHistoryQueue.getMetrics("completed", 0, MetricsTime.ONE_HOUR * 6)).data
          .slice(1)
          .reduce((acc, cur) => Number(acc) + Number(cur), 0)),
        "12hours": Number((await corporationHistoryQueue.getMetrics("completed", 0, MetricsTime.ONE_HOUR * 12)).data
          .slice(1)
          .reduce((acc, cur) => Number(acc) + Number(cur), 0)),
        "24hours": Number((await corporationHistoryQueue.getMetrics("completed", 0, MetricsTime.ONE_HOUR * 24)).data
          .slice(1)
          .reduce((acc, cur) => Number(acc) + Number(cur), 0)),
        "1week": Number((await corporationHistoryQueue.getMetrics("completed", 0, MetricsTime.ONE_HOUR * 24 * 7)).data
          .slice(1)
          .reduce((acc, cur) => Number(acc) + Number(cur), 0)),
        "1month": Number((await corporationHistoryQueue.getMetrics("completed", 0, MetricsTime.ONE_MONTH)).data
          .slice(1)
          .reduce((acc, cur) => Number(acc) + Number(cur), 0)),
      },
      wars: {
        "1min": Number((await warQueue.getMetrics("completed", 0, MetricsTime.ONE_MINUTE)).data[0]) || 0,
        "5min": Number((await warQueue.getMetrics("completed", 0, MetricsTime.FIVE_MINUTES)).data
          .slice(1)
          .reduce((acc, cur) => Number(acc) + Number(cur), 0)),
        "15min": Number((await warQueue.getMetrics("completed", 0, MetricsTime.FIFTEEN_MINUTES)).data
          .slice(1)
          .reduce((acc, cur) => Number(acc) + Number(cur), 0)),
        "1hour": Number((await warQueue.getMetrics("completed", 0, MetricsTime.ONE_HOUR)).data
          .slice(1)
          .reduce((acc, cur) => Number(acc) + Number(cur), 0)),
        "6hours": Number((await warQueue.getMetrics("completed", 0, MetricsTime.ONE_HOUR * 6)).data
          .slice(1)
          .reduce((acc, cur) => Number(acc) + Number(cur), 0)),
        "12hours": Number((await warQueue.getMetrics("completed", 0, MetricsTime.ONE_HOUR * 12)).data
          .slice(1)
          .reduce((acc, cur) => Number(acc) + Number(cur), 0)),
        "24hours": Number((await warQueue.getMetrics("completed", 0, MetricsTime.ONE_HOUR * 24)).data
          .slice(1)
          .reduce((acc, cur) => Number(acc) + Number(cur), 0)),
        "1week": Number((await warQueue.getMetrics("completed", 0, MetricsTime.ONE_HOUR * 24 * 7)).data
          .slice(1)
          .reduce((acc, cur) => Number(acc) + Number(cur), 0)),
        "1month": Number((await warQueue.getMetrics("completed", 0, MetricsTime.ONE_MONTH)).data
          .slice(1)
          .reduce((acc, cur) => Number(acc) + Number(cur), 0)),
      },
    },
    databaseCounts: {
      alliances: allianceCount,
      celestial: celestialCount,
      characters: characterCount,
      comments: commentCount,
      constellations: constellationCount,
      customPrices: customPriceCount,
      factions: factionCount,
      invFlags: invFlagCount,
      invGroups: invGroupCount,
      invTypes: invTypeCount,
      killmails: killmailCount,
      esiKillmails: esiKillmailCount,
      unprocessedCount: esiKillmailCount - killmailCount,
      prices: priceCount,
      regions: regionCount,
      solarSystems: solarSystemsCount,
      users: userCount,
      wars: warCount,
    },
    cacheSizes: {
      solarSystemsCache: cacheStats[0],
      regionsCache: cacheStats[1],
      constellationsCache: cacheStats[2],
      customPriceCache: cacheStats[3],
      invGroupsCache: cacheStats[4],
      invFlagsCache: cacheStats[5],
      invTypesCache: cacheStats[6],
      factionsCache: cacheStats[7],
      priceCache: cacheStats[8],
      characterCache: cacheStats[9],
      corporationCache: cacheStats[10],
      allianceCache: cacheStats[11],
    },
    cacheHits,
  };
});
