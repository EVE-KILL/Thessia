import { cliLogger } from "../server/helpers/Logger";
import { Characters } from "../server/models/Characters";
import { HistoricalStats } from "../server/models/HistoricalStats";
import { processHistoricalStats } from "../server/queue/HistoricalStats";

export default {
    name: "testHistoricalStatsOptimizations",
    description:
        "Test the optimized historical stats processing for a few entities",
    run: async () => {
        cliLogger.info("🧪 Testing historical stats optimizations...");

        // Test with specific alliance and corporation IDs
        try {
            const testAllianceId = 1900696668;
            const testCorporationId = 98403734;
            const currentDate = new Date();

            // Get actual member count for the test alliance
            const allianceMemberCount = await Characters.countDocuments({
                alliance_id: testAllianceId,
            });

            if (allianceMemberCount > 0) {
                cliLogger.info(
                    `🏛️ Testing alliance ${testAllianceId} with ${allianceMemberCount} members`
                );

                const startTime = Date.now();
                await processHistoricalStats(
                    testAllianceId,
                    "alliance",
                    allianceMemberCount,
                    currentDate
                );
                const allianceTime = Date.now() - startTime;

                cliLogger.info(
                    `✅ Alliance processing completed in ${allianceTime}ms`
                );

                // Check the result
                const allianceStats = await HistoricalStats.findOne({
                    alliance_id: testAllianceId,
                    corporation_id: 0,
                });

                if (allianceStats) {
                    cliLogger.info(`📊 Alliance stats summary:`);
                    cliLogger.info(
                        `   - Member count: ${(allianceStats as any).count}`
                    );
                    cliLogger.info(
                        `   - Historical entries: ${
                            (allianceStats as any).historicalCounts?.length || 0
                        }`
                    );
                    cliLogger.info(
                        `   - Achievement points: ${
                            (allianceStats as any).total_achievement_points || 0
                        }`
                    );
                    cliLogger.info(
                        `   - Security status: ${
                            (allianceStats as any).avg_sec_status?.toFixed(2) ||
                            "N/A"
                        }`
                    );
                    cliLogger.info(
                        `   - Change 1d: ${
                            (allianceStats as any).change_1d || "N/A"
                        }`
                    );
                    cliLogger.info(
                        `   - Change 7d: ${
                            (allianceStats as any).change_7d || "N/A"
                        }`
                    );
                    cliLogger.info(
                        `   - Change 30d: ${
                            (allianceStats as any).change_30d || "N/A"
                        }`
                    );
                }
            } else {
                cliLogger.warn(
                    `⚠️ No members found for alliance ${testAllianceId}`
                );
            }

            // Get actual member count for the test corporation
            const corpMemberCount = await Characters.countDocuments({
                corporation_id: testCorporationId,
            });

            if (corpMemberCount > 0) {
                cliLogger.info(
                    `🏢 Testing corporation ${testCorporationId} with ${corpMemberCount} members`
                );

                const startTime = Date.now();
                await processHistoricalStats(
                    testCorporationId,
                    "corporation",
                    corpMemberCount,
                    currentDate
                );
                const corpTime = Date.now() - startTime;

                cliLogger.info(
                    `✅ Corporation processing completed in ${corpTime}ms`
                );

                // Check the result
                const corpStats = await HistoricalStats.findOne({
                    corporation_id: testCorporationId,
                    alliance_id: 0,
                });

                if (corpStats) {
                    cliLogger.info(`📊 Corporation stats summary:`);
                    cliLogger.info(
                        `   - Member count: ${(corpStats as any).count}`
                    );
                    cliLogger.info(
                        `   - Historical entries: ${
                            (corpStats as any).historicalCounts?.length || 0
                        }`
                    );
                    cliLogger.info(
                        `   - Achievement points: ${
                            (corpStats as any).total_achievement_points || 0
                        }`
                    );
                    cliLogger.info(
                        `   - Security status: ${
                            (corpStats as any).avg_sec_status?.toFixed(2) ||
                            "N/A"
                        }`
                    );
                    cliLogger.info(
                        `   - Change 1d: ${
                            (corpStats as any).change_1d || "N/A"
                        }`
                    );
                    cliLogger.info(
                        `   - Change 7d: ${
                            (corpStats as any).change_7d || "N/A"
                        }`
                    );
                    cliLogger.info(
                        `   - Change 30d: ${
                            (corpStats as any).change_30d || "N/A"
                        }`
                    );
                }
            } else {
                cliLogger.warn(
                    `⚠️ No members found for corporation ${testCorporationId}`
                );
            }

            // Test historical counts validation
            cliLogger.info("🔍 Validating historical counts structure...");
            const recentStats = await HistoricalStats.find({})
                .sort({ updatedAt: -1 })
                .limit(5)
                .lean();

            recentStats.forEach((stat, index) => {
                const statAny = stat as any;
                const entityType =
                    statAny.alliance_id > 0 ? "alliance" : "corporation";
                const entityId =
                    statAny.alliance_id > 0
                        ? statAny.alliance_id
                        : statAny.corporation_id;
                const histCounts = statAny.historicalCounts || [];

                cliLogger.info(`   ${index + 1}. ${entityType} ${entityId}:`);
                cliLogger.info(`      - Current count: ${statAny.count}`);
                cliLogger.info(
                    `      - Historical entries: ${histCounts.length}`
                );
                if (histCounts.length > 0) {
                    cliLogger.info(
                        `      - Latest historical: ${histCounts[0].count} (${histCounts[0].date})`
                    );
                    cliLogger.info(
                        `      - Oldest historical: ${
                            histCounts[histCounts.length - 1].count
                        } (${histCounts[histCounts.length - 1].date})`
                    );
                }
            });

            cliLogger.info(
                "✅ Historical stats optimization test completed successfully!"
            );
        } catch (error: any) {
            cliLogger.error(`💥 Test failed: ${error.message}`);
            cliLogger.error(error.stack);
        }
    },
};
