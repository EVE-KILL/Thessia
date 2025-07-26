import { cliLogger } from "~/server/helpers/Logger";
import { Characters } from "~/server/models/Characters";
import { HistoricalStats } from "~/server/models/HistoricalStats";
import { CharacterAchievements } from "~/server/models/CharacterAchievements";

const processAllianceData = async (alliance: any, currentDate: Date) => {
    const previousStats = await HistoricalStats.findOne({
        alliance_id: alliance._id.alliance_id,
        corporation_id: 0,
    });

    let historicalCounts = [];
    if (previousStats) {
        historicalCounts = previousStats.historicalCounts || [];
        cliLogger.info(
            `Alliance ${alliance._id.alliance_id}: Found ${historicalCounts.length} existing historical counts`
        );
        historicalCounts.unshift({
            count: previousStats.count,
            date: previousStats.date,
        });
        if (historicalCounts.length > 30) {
            historicalCounts = historicalCounts.slice(0, 30);
        }
        cliLogger.info(
            `Alliance ${alliance._id.alliance_id}: After processing, has ${historicalCounts.length} historical counts`
        );
    } else {
        cliLogger.info(
            `Alliance ${alliance._id.alliance_id}: No previous stats found, starting fresh`
        );
    }

    let secStats = {
        sum_sec_status: 0,
        avg_sec_status: 0,
        pirate_members: 0,
        carebear_members: 0,
        neutral_members: 0,
    };
    const allianceId = alliance._id.alliance_id;
    if (allianceId) {
        const characterSecStats = await Characters.aggregate([
            { $match: { alliance_id: allianceId } },
            {
                $group: {
                    _id: null,
                    sum_sec_status: { $sum: "$security_status" },
                    avg_sec_status: { $avg: "$security_status" },
                    pirate_members: {
                        $sum: {
                            $cond: [{ $lt: ["$security_status", 0] }, 1, 0],
                        },
                    },
                    carebear_members: {
                        $sum: {
                            $cond: [{ $gt: ["$security_status", 0] }, 1, 0],
                        },
                    },
                    neutral_members: {
                        $sum: {
                            $cond: [{ $eq: ["$security_status", 0] }, 1, 0],
                        },
                    },
                },
            },
        ]);
        if (characterSecStats.length > 0) {
            secStats = characterSecStats[0];
        }
    }

    // Calculate changes for different periods
    const change_1d =
        historicalCounts.length >= 1
            ? alliance.count - historicalCounts[0].count
            : 0;
    const change_7d =
        historicalCounts.length >= 7
            ? alliance.count - historicalCounts[6].count
            : null;
    const change_14d =
        historicalCounts.length >= 14
            ? alliance.count - historicalCounts[13].count
            : null;
    const change_30d =
        historicalCounts.length >= 30
            ? alliance.count - historicalCounts[29].count
            : null;

    // Calculate achievement points for alliance members
    let achievementStats = {
        total_achievement_points: 0,
        avg_achievement_points: 0,
        top_achievement_character_id: null,
        top_achievement_character_points: 0,
    };

    if (allianceId) {
        // Get all characters in this alliance using cursor
        const characterCursor = Characters.find({ alliance_id: allianceId })
            .select("character_id")
            .cursor();

        let totalPoints = 0;
        let memberCount = 0;
        let topCharacterId = null;
        let topCharacterPoints = 0;

        for (
            let character = await characterCursor.next();
            character != null;
            character = await characterCursor.next()
        ) {
            // Get achievement data for this character
            const characterAchievement = await CharacterAchievements.findOne(
                { character_id: character.character_id },
                { total_points: 1, character_id: 1 }
            );

            if (characterAchievement && characterAchievement.total_points > 0) {
                totalPoints += characterAchievement.total_points;
                memberCount++;

                // Track top character
                if (characterAchievement.total_points > topCharacterPoints) {
                    topCharacterPoints = characterAchievement.total_points;
                    topCharacterId = characterAchievement.character_id;
                }
            }
        }

        achievementStats.total_achievement_points = totalPoints;
        achievementStats.avg_achievement_points =
            memberCount > 0 ? totalPoints / memberCount : 0;
        achievementStats.top_achievement_character_id = topCharacterId;
        achievementStats.top_achievement_character_points = topCharacterPoints;
    }

    await HistoricalStats.updateOne(
        {
            alliance_id: alliance._id.alliance_id,
            corporation_id: 0,
        },
        {
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
                // Store achievement stats
                total_achievement_points:
                    achievementStats.total_achievement_points,
                avg_achievement_points: achievementStats.avg_achievement_points,
                top_achievement_character_id:
                    achievementStats.top_achievement_character_id,
                top_achievement_character_points:
                    achievementStats.top_achievement_character_points,
            },
        },
        { upsert: true }
    );
};

const processCorporationData = async (corporation: any, currentDate: Date) => {
    const previousStats = await HistoricalStats.findOne({
        alliance_id: 0,
        corporation_id: corporation._id.corporation_id,
    });

    let historicalCounts = [];
    if (previousStats) {
        historicalCounts = previousStats.historicalCounts || [];
        cliLogger.info(
            `Corporation ${corporation._id.corporation_id}: Found ${historicalCounts.length} existing historical counts`
        );
        historicalCounts.unshift({
            count: previousStats.count,
            date: previousStats.date,
        });
        if (historicalCounts.length > 30) {
            historicalCounts = historicalCounts.slice(0, 30);
        }
        cliLogger.info(
            `Corporation ${corporation._id.corporation_id}: After processing, has ${historicalCounts.length} historical counts`
        );
    } else {
        cliLogger.info(
            `Corporation ${corporation._id.corporation_id}: No previous stats found, starting fresh`
        );
    }

    let secStats = {
        sum_sec_status: 0,
        avg_sec_status: 0,
        pirate_members: 0,
        carebear_members: 0,
        neutral_members: 0,
    };
    const corporationId = corporation._id.corporation_id;
    if (corporationId) {
        const characterSecStats = await Characters.aggregate([
            { $match: { corporation_id: corporationId } },
            {
                $group: {
                    _id: null,
                    sum_sec_status: { $sum: "$security_status" },
                    avg_sec_status: { $avg: "$security_status" },
                    pirate_members: {
                        $sum: {
                            $cond: [{ $lt: ["$security_status", 0] }, 1, 0],
                        },
                    },
                    carebear_members: {
                        $sum: {
                            $cond: [{ $gt: ["$security_status", 0] }, 1, 0],
                        },
                    },
                    neutral_members: {
                        $sum: {
                            $cond: [{ $eq: ["$security_status", 0] }, 1, 0],
                        },
                    },
                },
            },
        ]);
        if (characterSecStats.length > 0) {
            secStats = characterSecStats[0];
        }
    }

    // Calculate changes for different periods
    const change_1d =
        historicalCounts.length >= 1
            ? corporation.count - historicalCounts[0].count
            : 0;
    const change_7d =
        historicalCounts.length >= 7
            ? corporation.count - historicalCounts[6].count
            : null;
    const change_14d =
        historicalCounts.length >= 14
            ? corporation.count - historicalCounts[13].count
            : null;
    const change_30d =
        historicalCounts.length >= 30
            ? corporation.count - historicalCounts[29].count
            : null;

    // Calculate achievement points for corporation members
    let achievementStats = {
        total_achievement_points: 0,
        avg_achievement_points: 0,
        top_achievement_character_id: null,
        top_achievement_character_points: 0,
    };

    if (corporationId) {
        // Get all characters in this corporation using cursor
        const characterCursor = Characters.find({
            corporation_id: corporationId,
        })
            .select("character_id")
            .cursor();

        let totalPoints = 0;
        let memberCount = 0;
        let topCharacterId = null;
        let topCharacterPoints = 0;

        for (
            let character = await characterCursor.next();
            character != null;
            character = await characterCursor.next()
        ) {
            // Get achievement data for this character
            const characterAchievement = await CharacterAchievements.findOne(
                { character_id: character.character_id },
                { total_points: 1, character_id: 1 }
            );

            if (characterAchievement && characterAchievement.total_points > 0) {
                totalPoints += characterAchievement.total_points;
                memberCount++;

                // Track top character
                if (characterAchievement.total_points > topCharacterPoints) {
                    topCharacterPoints = characterAchievement.total_points;
                    topCharacterId = characterAchievement.character_id;
                }
            }
        }

        achievementStats.total_achievement_points = totalPoints;
        achievementStats.avg_achievement_points =
            memberCount > 0 ? totalPoints / memberCount : 0;
        achievementStats.top_achievement_character_id = topCharacterId;
        achievementStats.top_achievement_character_points = topCharacterPoints;
    }

    cliLogger.info(
        `Corporation ${corporation._id.corporation_id}: Final historicalCounts length: ${historicalCounts.length}, change_1d: ${change_1d}, change_7d: ${change_7d}, total_achievement_points: ${achievementStats.total_achievement_points}`
    );

    await HistoricalStats.updateOne(
        {
            alliance_id: 0,
            corporation_id: corporation._id.corporation_id,
        },
        {
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
                // Store achievement stats
                total_achievement_points:
                    achievementStats.total_achievement_points,
                avg_achievement_points: achievementStats.avg_achievement_points,
                top_achievement_character_id:
                    achievementStats.top_achievement_character_id,
                top_achievement_character_points:
                    achievementStats.top_achievement_character_points,
            },
        },
        { upsert: true }
    );
};

export default {
    name: "updateHistoricalCounts",
    description: "Update historical counts",
    schedule: "0 0 * * *",
    run: async () => {
        const currentDate = new Date();

        // Process Alliances using cursor
        cliLogger.info("Starting alliance processing with cursor...");
        const allianceAggregationCursor = Characters.aggregate([
            {
                $match: {
                    alliance_id: { $exists: true, $ne: null, $ne: 0 },
                },
            },
            {
                $group: {
                    _id: { alliance_id: "$alliance_id" },
                    count: { $sum: 1 },
                },
            },
        ]).cursor();

        let allianceCount = 0;
        for (
            let alliance = await allianceAggregationCursor.next();
            alliance != null;
            alliance = await allianceAggregationCursor.next()
        ) {
            await processAllianceData(alliance, currentDate);
            allianceCount++;
            if (allianceCount % 100 === 0) {
                cliLogger.info(`Processed ${allianceCount} alliances...`);
            }
        }

        cliLogger.info(`Processed ${allianceCount} alliance operations`);

        // Process Corporations using cursor
        cliLogger.info("Starting corporation processing with cursor...");
        const corporationAggregationCursor = Characters.aggregate([
            {
                $match: {
                    corporation_id: {
                        $exists: true,
                        $ne: null,
                        $ne: 0,
                        $gt: 1999999,
                    },
                },
            },
            {
                $group: {
                    _id: { corporation_id: "$corporation_id" },
                    count: { $sum: 1 },
                },
            },
        ]).cursor();

        let corporationCount = 0;
        for (
            let corporation = await corporationAggregationCursor.next();
            corporation != null;
            corporation = await corporationAggregationCursor.next()
        ) {
            await processCorporationData(corporation, currentDate);
            corporationCount++;
            if (corporationCount % 100 === 0) {
                cliLogger.info(`Processed ${corporationCount} corporations...`);
            }
        }

        cliLogger.info(`Processed ${corporationCount} corporation operations`);

        return cliLogger.info(
            "Updated historical counts and pre-calculated changes"
        );
    },
};
