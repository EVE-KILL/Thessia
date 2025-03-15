import { cliLogger } from "../server/helpers/Logger";
import { Characters } from "../server/models/Characters";
import { HistoricalStats } from "../server/models/HistoricalStats";

export default {
  name: "updateHistoricalCounts",
  description: "Update historical counts",
  schedule: "0 0 * * *",
  run: async () => {
    const currentDate = new Date();

    // Alliances
    const allianceCountAggregation = [
      {
        $group: {
          _id: { alliance_id: "$alliance_id" },
          count: { $sum: 1 },
        },
      },
    ];

    const allianceCounts = await Characters.aggregate(allianceCountAggregation);

    const allianceIDs = allianceCounts.map((a) => a._id.alliance_id);
    const existingAllianceStats = await HistoricalStats.find({
      alliance_id: { $in: allianceIDs },
      corporation_id: 0,
    });
    const existingAllianceMap = new Map();
    for (const s of existingAllianceStats) {
      existingAllianceMap.set(s.alliance_id, s);
    }

    const allianceOps = allianceCounts.map((alliance) => {
      const previousStats = existingAllianceMap.get(alliance._id.alliance_id);
      let historicalCounts = [];
      if (previousStats) {
        historicalCounts = previousStats.historicalCounts || [];
        historicalCounts.unshift({ count: previousStats.count, date: previousStats.date });
        if (historicalCounts.length > 30) {
          historicalCounts = historicalCounts.slice(0, 30);
        }
      }
      return {
        updateOne: {
          filter: {
            alliance_id: alliance._id.alliance_id,
            corporation_id: 0,
          },
          update: {
            $set: {
              count: alliance.count,
              previousCount: previousStats?.count,
              date: currentDate,
              historicalCounts,
            },
          },
          upsert: true,
        },
      };
    });
    await HistoricalStats.bulkWrite(allianceOps);

    // Corporations
    const corporationCountAggregation = [
      {
        $group: {
          _id: { corporation_id: "$corporation_id" },
          count: { $sum: 1 },
        },
      },
    ];

    const corporationCounts = await Characters.aggregate(corporationCountAggregation);

    const corporationIDs = corporationCounts.map((c) => c._id.corporation_id);
    const existingCorpStats = await HistoricalStats.find({
      alliance_id: 0,
      corporation_id: { $in: corporationIDs },
    });
    const existingCorpMap = new Map();
    for (const s of existingCorpStats) {
      existingCorpMap.set(s.corporation_id, s);
    }

    const corporationOps = corporationCounts.map((corporation) => {
      const previousStats = existingCorpMap.get(corporation._id.corporation_id);
      let historicalCounts = [];
      if (previousStats) {
        historicalCounts = previousStats.historicalCounts || [];
        historicalCounts.unshift({ count: previousStats.count, date: previousStats.date });
        if (historicalCounts.length > 30) {
          historicalCounts = historicalCounts.slice(0, 30);
        }
      }
      return {
        updateOne: {
          filter: {
            alliance_id: 0,
            corporation_id: corporation._id.corporation_id,
          },
          update: {
            $set: {
              count: corporation.count,
              previousCount: previousStats?.count,
              date: currentDate,
              historicalCounts,
            },
          },
          upsert: true,
        },
      };
    });
    await HistoricalStats.bulkWrite(corporationOps);

    return cliLogger.info("Updated historical counts");
  },
};
