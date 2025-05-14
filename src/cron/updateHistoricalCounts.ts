import { cliLogger } from "~/server/helpers/Logger";
import { Characters } from "~/server/models/Characters";
import { HistoricalStats } from "~/server/models/HistoricalStats";

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

        const allianceCounts = (await Characters.aggregate(allianceCountAggregation))
            .filter(ac => ac._id.alliance_id != null &&
                ac._id.alliance_id !== 0);

        const allianceIDs = allianceCounts.map((a) => a._id.alliance_id);
        const existingAllianceStats = await HistoricalStats.find({
            alliance_id: { $in: allianceIDs },
            corporation_id: 0,
        });
        const existingAllianceMap = new Map();
        for (const s of existingAllianceStats) {
            existingAllianceMap.set(s.alliance_id, s);
        }

        const allianceOps = await Promise.all(allianceCounts.map(async (alliance) => {
            const previousStats = existingAllianceMap.get(alliance._id.alliance_id);
            let historicalCounts = [];
            if (previousStats) {
                historicalCounts = previousStats.historicalCounts || [];
                historicalCounts.unshift({ count: previousStats.count, date: previousStats.date });
                if (historicalCounts.length > 30) {
                    historicalCounts = historicalCounts.slice(0, 30);
                }
            }

            let secStats = { sum_sec_status: 0, avg_sec_status: 0, pirate_members: 0, carebear_members: 0, neutral_members: 0 };
            const allianceId = alliance._id.alliance_id;
            if (allianceId) {
                const characterSecStats = await Characters.aggregate([
                    { $match: { alliance_id: allianceId } },
                    {
                        $group: {
                            _id: null,
                            sum_sec_status: { $sum: "$security_status" },
                            avg_sec_status: { $avg: "$security_status" },
                            pirate_members: { $sum: { $cond: [{ $lt: ["$security_status", 0] }, 1, 0] } },
                            carebear_members: { $sum: { $cond: [{ $gt: ["$security_status", 0] }, 1, 0] } },
                            neutral_members: { $sum: { $cond: [{ $eq: ["$security_status", 0] }, 1, 0] } },
                        },
                    },
                ]);
                if (characterSecStats.length > 0) {
                    secStats = characterSecStats[0];
                }
            }

            // Calculate changes for different periods
            const change_1d = historicalCounts.length >= 1 ? alliance.count - historicalCounts[0].count : 0;
            const change_7d = historicalCounts.length >= 7 ? alliance.count - historicalCounts[Math.min(6, historicalCounts.length - 1)].count : null;
            const change_14d = historicalCounts.length >= 14 ? alliance.count - historicalCounts[Math.min(13, historicalCounts.length - 1)].count : null;
            const change_30d = historicalCounts.length >= 30 ? alliance.count - historicalCounts[Math.min(29, historicalCounts.length - 1)].count : null;

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
                            sum_sec_status: secStats.sum_sec_status,
                            avg_sec_status: secStats.avg_sec_status,
                            pirate_members: secStats.pirate_members,
                            carebear_members: secStats.carebear_members,
                            neutral_members: secStats.neutral_members,
                            // Store pre-calculated changes
                            change_1d,
                            change_7d,
                            change_14d,
                            change_30d,
                        },
                    },
                    upsert: true,
                },
            };
        }));
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

        const corporationCounts = (await Characters.aggregate(corporationCountAggregation))
            .filter(cc => cc._id.corporation_id != null && cc._id.corporation_id !== 0 && cc._id.corporation_id > 1999999);

        const corporationIDs = corporationCounts.map((c) => c._id.corporation_id);
        const existingCorpStats = await HistoricalStats.find({
            alliance_id: 0,
            corporation_id: { $in: corporationIDs },
        });
        const existingCorpMap = new Map();
        for (const s of existingCorpStats) {
            existingCorpMap.set(s.corporation_id, s);
        }

        const corporationOps = await Promise.all(corporationCounts.map(async (corporation) => {
            const previousStats = existingCorpMap.get(corporation._id.corporation_id);
            let historicalCounts = [];
            if (previousStats) {
                historicalCounts = previousStats.historicalCounts || [];
                historicalCounts.unshift({ count: previousStats.count, date: previousStats.date });
                if (historicalCounts.length > 30) {
                    historicalCounts = historicalCounts.slice(0, 30);
                }
            }

            let secStats = { sum_sec_status: 0, avg_sec_status: 0, pirate_members: 0, carebear_members: 0, neutral_members: 0 };
            const corporationId = corporation._id.corporation_id;
            if (corporationId) {
                const characterSecStats = await Characters.aggregate([
                    { $match: { corporation_id: corporationId } },
                    {
                        $group: {
                            _id: null,
                            sum_sec_status: { $sum: "$security_status" },
                            avg_sec_status: { $avg: "$security_status" },
                            pirate_members: { $sum: { $cond: [{ $lt: ["$security_status", 0] }, 1, 0] } },
                            carebear_members: { $sum: { $cond: [{ $gt: ["$security_status", 0] }, 1, 0] } },
                            neutral_members: { $sum: { $cond: [{ $eq: ["$security_status", 0] }, 1, 0] } },
                        },
                    },
                ]);
                if (characterSecStats.length > 0) {
                    secStats = characterSecStats[0];
                }
            }

            // Calculate changes for different periods
            const change_1d = historicalCounts.length >= 1 ? corporation.count - historicalCounts[0].count : 0;
            const change_7d = historicalCounts.length >= 7 ? corporation.count - historicalCounts[Math.min(6, historicalCounts.length - 1)].count : null;
            const change_14d = historicalCounts.length >= 14 ? corporation.count - historicalCounts[Math.min(13, historicalCounts.length - 1)].count : null;
            const change_30d = historicalCounts.length >= 30 ? corporation.count - historicalCounts[Math.min(29, historicalCounts.length - 1)].count : null;

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
                            sum_sec_status: secStats.sum_sec_status,
                            avg_sec_status: secStats.avg_sec_status,
                            pirate_members: secStats.pirate_members,
                            carebear_members: secStats.carebear_members,
                            neutral_members: secStats.neutral_members,
                            // Store pre-calculated changes
                            change_1d,
                            change_7d,
                            change_14d,
                            change_30d,
                        },
                    },
                    upsert: true,
                },
            };
        }));
        await HistoricalStats.bulkWrite(corporationOps);

        return cliLogger.info("Updated historical counts and pre-calculated changes");
    },
};
