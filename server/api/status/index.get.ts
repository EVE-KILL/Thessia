import os from "node:os";
import { MetricsTime } from "bullmq";
import { createQueue } from "../../helpers/Queue";

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
      loadAvg: os.loadavg().map((avg) => avg.toFixed(2)),
      totalCPUs: formatNumber(os.cpus().length),
      totalMemoryGB: formatNumber(Math.floor(os.totalmem() / 1024 / 1024 / 1024)),
    },
    queueCounts: {
      alliance: formatNumber(allianceQueueCount),
      corporation: formatNumber(corporationQueueCount),
      character: formatNumber(characterQueueCount),
      characterhistory: formatNumber(characterHistoryQueueCount),
      corporationhistory: formatNumber(corporationHistoryQueueCount),
      killmail: formatNumber(killmailQueueCount),
      war: formatNumber(warQueueCount),
    },
    processedCounts: {
      killmails: {
        "1min": formatNumber(
          Number(
            (await killmailQueue.getMetrics("completed", 0, MetricsTime.ONE_MINUTE)).data[0],
          ) || 0,
        ),
        "5min": formatNumber(
          Number(
            (await killmailQueue.getMetrics("completed", 0, MetricsTime.FIVE_MINUTES)).data
              .slice(1)
              .reduce((acc, cur) => Number(acc) + Number(cur), 0),
          ),
        ),
        "15min": formatNumber(
          Number(
            (await killmailQueue.getMetrics("completed", 0, MetricsTime.FIFTEEN_MINUTES)).data
              .slice(1)
              .reduce((acc, cur) => Number(acc) + Number(cur), 0),
          ),
        ),
        "1hour": formatNumber(
          Number(
            (await killmailQueue.getMetrics("completed", 0, MetricsTime.ONE_HOUR)).data
              .slice(1)
              .reduce((acc, cur) => Number(acc) + Number(cur), 0),
          ),
        ),
        "6hours": formatNumber(
          Number(
            (await killmailQueue.getMetrics("completed", 0, MetricsTime.ONE_HOUR * 6)).data
              .slice(1)
              .reduce((acc, cur) => Number(acc) + Number(cur), 0),
          ),
        ),
        "12hours": formatNumber(
          Number(
            (await killmailQueue.getMetrics("completed", 0, MetricsTime.ONE_HOUR * 12)).data
              .slice(1)
              .reduce((acc, cur) => Number(acc) + Number(cur), 0),
          ),
        ),
        "24hours": formatNumber(
          Number(
            (await killmailQueue.getMetrics("completed", 0, MetricsTime.ONE_HOUR * 24)).data
              .slice(1)
              .reduce((acc, cur) => Number(acc) + Number(cur), 0),
          ),
        ),
        "1week": formatNumber(
          Number(
            (await killmailQueue.getMetrics("completed", 0, MetricsTime.ONE_HOUR * 24 * 7)).data
              .slice(1)
              .reduce((acc, cur) => Number(acc) + Number(cur), 0),
          ),
        ),
        "1month": formatNumber(
          Number(
            (await killmailQueue.getMetrics("completed", 0, MetricsTime.ONE_MONTH)).data
              .slice(1)
              .reduce((acc, cur) => Number(acc) + Number(cur), 0),
          ),
        ),
      },
      alliances: {
        "1min": formatNumber(
          Number(
            (await allianceQueue.getMetrics("completed", 0, MetricsTime.ONE_MINUTE)).data[0],
          ) || 0,
        ),
        "5min": formatNumber(
          Number(
            (await allianceQueue.getMetrics("completed", 0, MetricsTime.FIVE_MINUTES)).data
              .slice(1)
              .reduce((acc, cur) => Number(acc) + Number(cur), 0),
          ),
        ),
        "15min": formatNumber(
          Number(
            (await allianceQueue.getMetrics("completed", 0, MetricsTime.FIFTEEN_MINUTES)).data
              .slice(1)
              .reduce((acc, cur) => Number(acc) + Number(cur), 0),
          ),
        ),
        "1hour": formatNumber(
          Number(
            (await allianceQueue.getMetrics("completed", 0, MetricsTime.ONE_HOUR)).data
              .slice(1)
              .reduce((acc, cur) => Number(acc) + Number(cur), 0),
          ),
        ),
        "6hours": formatNumber(
          Number(
            (await allianceQueue.getMetrics("completed", 0, MetricsTime.ONE_HOUR * 6)).data
              .slice(1)
              .reduce((acc, cur) => Number(acc) + Number(cur), 0),
          ),
        ),
        "12hours": formatNumber(
          Number(
            (await allianceQueue.getMetrics("completed", 0, MetricsTime.ONE_HOUR * 12)).data
              .slice(1)
              .reduce((acc, cur) => Number(acc) + Number(cur), 0),
          ),
        ),
        "24hours": formatNumber(
          Number(
            (await allianceQueue.getMetrics("completed", 0, MetricsTime.ONE_HOUR * 24)).data
              .slice(1)
              .reduce((acc, cur) => Number(acc) + Number(cur), 0),
          ),
        ),
        "1week": formatNumber(
          Number(
            (await allianceQueue.getMetrics("completed", 0, MetricsTime.ONE_HOUR * 24 * 7)).data
              .slice(1)
              .reduce((acc, cur) => Number(acc) + Number(cur), 0),
          ),
        ),
        "1month": formatNumber(
          Number(
            (await allianceQueue.getMetrics("completed", 0, MetricsTime.ONE_MONTH)).data
              .slice(1)
              .reduce((acc, cur) => Number(acc) + Number(cur), 0),
          ),
        ),
      },
      corporations: {
        "1min": formatNumber(
          Number(
            (await corporationQueue.getMetrics("completed", 0, MetricsTime.ONE_MINUTE)).data[0],
          ) || 0,
        ),
        "5min": formatNumber(
          Number(
            (await corporationQueue.getMetrics("completed", 0, MetricsTime.FIVE_MINUTES)).data
              .slice(1)
              .reduce((acc, cur) => Number(acc) + Number(cur), 0),
          ),
        ),
        "15min": formatNumber(
          Number(
            (await corporationQueue.getMetrics("completed", 0, MetricsTime.FIFTEEN_MINUTES)).data
              .slice(1)
              .reduce((acc, cur) => Number(acc) + Number(cur), 0),
          ),
        ),
        "1hour": formatNumber(
          Number(
            (await corporationQueue.getMetrics("completed", 0, MetricsTime.ONE_HOUR)).data
              .slice(1)
              .reduce((acc, cur) => Number(acc) + Number(cur), 0),
          ),
        ),
        "6hours": formatNumber(
          Number(
            (await corporationQueue.getMetrics("completed", 0, MetricsTime.ONE_HOUR * 6)).data
              .slice(1)
              .reduce((acc, cur) => Number(acc) + Number(cur), 0),
          ),
        ),
        "12hours": formatNumber(
          Number(
            (await corporationQueue.getMetrics("completed", 0, MetricsTime.ONE_HOUR * 12)).data
              .slice(1)
              .reduce((acc, cur) => Number(acc) + Number(cur), 0),
          ),
        ),
        "24hours": formatNumber(
          Number(
            (await corporationQueue.getMetrics("completed", 0, MetricsTime.ONE_HOUR * 24)).data
              .slice(1)
              .reduce((acc, cur) => Number(acc) + Number(cur), 0),
          ),
        ),
        "1week": formatNumber(
          Number(
            (await corporationQueue.getMetrics("completed", 0, MetricsTime.ONE_HOUR * 24 * 7)).data
              .slice(1)
              .reduce((acc, cur) => Number(acc) + Number(cur), 0),
          ),
        ),
        "1month": formatNumber(
          Number(
            (await corporationQueue.getMetrics("completed", 0, MetricsTime.ONE_MONTH)).data
              .slice(1)
              .reduce((acc, cur) => Number(acc) + Number(cur), 0),
          ),
        ),
      },
      characters: {
        "1min": formatNumber(
          Number(
            (await characterQueue.getMetrics("completed", 0, MetricsTime.ONE_MINUTE)).data[0],
          ) || 0,
        ),
        "5min": formatNumber(
          Number(
            (await characterQueue.getMetrics("completed", 0, MetricsTime.FIVE_MINUTES)).data
              .slice(1)
              .reduce((acc, cur) => Number(acc) + Number(cur), 0),
          ),
        ),
        "15min": formatNumber(
          Number(
            (await characterQueue.getMetrics("completed", 0, MetricsTime.FIFTEEN_MINUTES)).data
              .slice(1)
              .reduce((acc, cur) => Number(acc) + Number(cur), 0),
          ),
        ),
        "1hour": formatNumber(
          Number(
            (await characterQueue.getMetrics("completed", 0, MetricsTime.ONE_HOUR)).data
              .slice(1)
              .reduce((acc, cur) => Number(acc) + Number(cur), 0),
          ),
        ),
        "6hours": formatNumber(
          Number(
            (await characterQueue.getMetrics("completed", 0, MetricsTime.ONE_HOUR * 6)).data
              .slice(1)
              .reduce((acc, cur) => Number(acc) + Number(cur), 0),
          ),
        ),
        "12hours": formatNumber(
          Number(
            (await characterQueue.getMetrics("completed", 0, MetricsTime.ONE_HOUR * 12)).data
              .slice(1)
              .reduce((acc, cur) => Number(acc) + Number(cur), 0),
          ),
        ),
        "24hours": formatNumber(
          Number(
            (await characterQueue.getMetrics("completed", 0, MetricsTime.ONE_HOUR * 24)).data
              .slice(1)
              .reduce((acc, cur) => Number(acc) + Number(cur), 0),
          ),
        ),
        "1week": formatNumber(
          Number(
            (await characterQueue.getMetrics("completed", 0, MetricsTime.ONE_HOUR * 24 * 7)).data
              .slice(1)
              .reduce((acc, cur) => Number(acc) + Number(cur), 0),
          ),
        ),
        "1month": formatNumber(
          Number(
            (await characterQueue.getMetrics("completed", 0, MetricsTime.ONE_MONTH)).data
              .slice(1)
              .reduce((acc, cur) => Number(acc) + Number(cur), 0),
          ),
        ),
      },
      characterhistory: {
        "1min": formatNumber(
          Number(
            (await characterHistoryQueue.getMetrics("completed", 0, MetricsTime.ONE_MINUTE))
              .data[0],
          ) || 0,
        ),
        "5min": formatNumber(
          Number(
            (await characterHistoryQueue.getMetrics("completed", 0, MetricsTime.FIVE_MINUTES)).data
              .slice(1)
              .reduce((acc, cur) => Number(acc) + Number(cur), 0),
          ),
        ),
        "15min": formatNumber(
          Number(
            (
              await characterHistoryQueue.getMetrics("completed", 0, MetricsTime.FIFTEEN_MINUTES)
            ).data
              .slice(1)
              .reduce((acc, cur) => Number(acc) + Number(cur), 0),
          ),
        ),
        "1hour": formatNumber(
          Number(
            (await characterHistoryQueue.getMetrics("completed", 0, MetricsTime.ONE_HOUR)).data
              .slice(1)
              .reduce((acc, cur) => Number(acc) + Number(cur), 0),
          ),
        ),
        "6hours": formatNumber(
          Number(
            (await characterHistoryQueue.getMetrics("completed", 0, MetricsTime.ONE_HOUR * 6)).data
              .slice(1)
              .reduce((acc, cur) => Number(acc) + Number(cur), 0),
          ),
        ),
        "12hours": formatNumber(
          Number(
            (await characterHistoryQueue.getMetrics("completed", 0, MetricsTime.ONE_HOUR * 12)).data
              .slice(1)
              .reduce((acc, cur) => Number(acc) + Number(cur), 0),
          ),
        ),
        "24hours": formatNumber(
          Number(
            (await characterHistoryQueue.getMetrics("completed", 0, MetricsTime.ONE_HOUR * 24)).data
              .slice(1)
              .reduce((acc, cur) => Number(acc) + Number(cur), 0),
          ),
        ),
        "1week": formatNumber(
          Number(
            (
              await characterHistoryQueue.getMetrics("completed", 0, MetricsTime.ONE_HOUR * 24 * 7)
            ).data
              .slice(1)
              .reduce((acc, cur) => Number(acc) + Number(cur), 0),
          ),
        ),
        "1month": formatNumber(
          Number(
            (await characterHistoryQueue.getMetrics("completed", 0, MetricsTime.ONE_MONTH)).data
              .slice(1)
              .reduce((acc, cur) => Number(acc) + Number(cur), 0),
          ),
        ),
      },
      corporationhistory: {
        "1min": formatNumber(
          Number(
            (await corporationHistoryQueue.getMetrics("completed", 0, MetricsTime.ONE_MINUTE))
              .data[0],
          ) || 0,
        ),
        "5min": formatNumber(
          Number(
            (
              await corporationHistoryQueue.getMetrics("completed", 0, MetricsTime.FIVE_MINUTES)
            ).data
              .slice(1)
              .reduce((acc, cur) => Number(acc) + Number(cur), 0),
          ),
        ),
        "15min": formatNumber(
          Number(
            (
              await corporationHistoryQueue.getMetrics("completed", 0, MetricsTime.FIFTEEN_MINUTES)
            ).data
              .slice(1)
              .reduce((acc, cur) => Number(acc) + Number(cur), 0),
          ),
        ),
        "1hour": formatNumber(
          Number(
            (await corporationHistoryQueue.getMetrics("completed", 0, MetricsTime.ONE_HOUR)).data
              .slice(1)
              .reduce((acc, cur) => Number(acc) + Number(cur), 0),
          ),
        ),
        "6hours": formatNumber(
          Number(
            (
              await corporationHistoryQueue.getMetrics("completed", 0, MetricsTime.ONE_HOUR * 6)
            ).data
              .slice(1)
              .reduce((acc, cur) => Number(acc) + Number(cur), 0),
          ),
        ),
        "12hours": formatNumber(
          Number(
            (
              await corporationHistoryQueue.getMetrics("completed", 0, MetricsTime.ONE_HOUR * 12)
            ).data
              .slice(1)
              .reduce((acc, cur) => Number(acc) + Number(cur), 0),
          ),
        ),
        "24hours": formatNumber(
          Number(
            (
              await corporationHistoryQueue.getMetrics("completed", 0, MetricsTime.ONE_HOUR * 24)
            ).data
              .slice(1)
              .reduce((acc, cur) => Number(acc) + Number(cur), 0),
          ),
        ),
        "1week": formatNumber(
          Number(
            (
              await corporationHistoryQueue.getMetrics(
                "completed",
                0,
                MetricsTime.ONE_HOUR * 24 * 7,
              )
            ).data
              .slice(1)
              .reduce((acc, cur) => Number(acc) + Number(cur), 0),
          ),
        ),
        "1month": formatNumber(
          Number(
            (await corporationHistoryQueue.getMetrics("completed", 0, MetricsTime.ONE_MONTH)).data
              .slice(1)
              .reduce((acc, cur) => Number(acc) + Number(cur), 0),
          ),
        ),
      },
      wars: {
        "1min": formatNumber(
          Number((await warQueue.getMetrics("completed", 0, MetricsTime.ONE_MINUTE)).data[0]) || 0,
        ),
        "5min": formatNumber(
          Number(
            (await warQueue.getMetrics("completed", 0, MetricsTime.FIVE_MINUTES)).data
              .slice(1)
              .reduce((acc, cur) => Number(acc) + Number(cur), 0),
          ),
        ),
        "15min": formatNumber(
          Number(
            (await warQueue.getMetrics("completed", 0, MetricsTime.FIFTEEN_MINUTES)).data
              .slice(1)
              .reduce((acc, cur) => Number(acc) + Number(cur), 0),
          ),
        ),
        "1hour": formatNumber(
          Number(
            (await warQueue.getMetrics("completed", 0, MetricsTime.ONE_HOUR)).data
              .slice(1)
              .reduce((acc, cur) => Number(acc) + Number(cur), 0),
          ),
        ),
        "6hours": formatNumber(
          Number(
            (await warQueue.getMetrics("completed", 0, MetricsTime.ONE_HOUR * 6)).data
              .slice(1)
              .reduce((acc, cur) => Number(acc) + Number(cur), 0),
          ),
        ),
        "12hours": formatNumber(
          Number(
            (await warQueue.getMetrics("completed", 0, MetricsTime.ONE_HOUR * 12)).data
              .slice(1)
              .reduce((acc, cur) => Number(acc) + Number(cur), 0),
          ),
        ),
        "24hours": formatNumber(
          Number(
            (await warQueue.getMetrics("completed", 0, MetricsTime.ONE_HOUR * 24)).data
              .slice(1)
              .reduce((acc, cur) => Number(acc) + Number(cur), 0),
          ),
        ),
        "1week": formatNumber(
          Number(
            (await warQueue.getMetrics("completed", 0, MetricsTime.ONE_HOUR * 24 * 7)).data
              .slice(1)
              .reduce((acc, cur) => Number(acc) + Number(cur), 0),
          ),
        ),
        "1month": formatNumber(
          Number(
            (await warQueue.getMetrics("completed", 0, MetricsTime.ONE_MONTH)).data
              .slice(1)
              .reduce((acc, cur) => Number(acc) + Number(cur), 0),
          ),
        ),
      },
    },
    databaseCounts: {
      alliances: formatNumber(allianceCount),
      celestial: formatNumber(celestialCount),
      characters: formatNumber(characterCount),
      comments: formatNumber(commentCount),
      constellations: formatNumber(constellationCount),
      customPrices: formatNumber(customPriceCount),
      factions: formatNumber(factionCount),
      invFlags: formatNumber(invFlagCount),
      invGroups: formatNumber(invGroupCount),
      invTypes: formatNumber(invTypeCount),
      killmails: formatNumber(killmailCount),
      esiKillmails: formatNumber(esiKillmailCount),
      unprocessedCount: formatNumber(esiKillmailCount - killmailCount),
      prices: formatNumber(priceCount),
      regions: formatNumber(regionCount),
      solarSystems: formatNumber(solarSystemsCount),
      users: formatNumber(userCount),
      wars: formatNumber(warCount),
    },
  };
});

function formatNumber(num: number): string {
  return num.toLocaleString("da-DK");
}
