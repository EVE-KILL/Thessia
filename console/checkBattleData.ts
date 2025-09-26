import { cliLogger } from "../server/helpers/Logger";
import { Battles } from "../server/models/Battles";

async function checkBattleData() {
    try {
        cliLogger.info("🔍 Checking Battles data structure...");

        // Get total count
        const totalCount = await Battles.estimatedDocumentCount();
        cliLogger.info(
            `📊 Total battles in MongoDB: ${totalCount.toLocaleString()}`
        );

        if (totalCount === 0) {
            cliLogger.info("No battles found in database");
            return;
        }

        // Get a sample battle to examine structure
        const sampleBattle = await Battles.findOne().lean();
        if (!sampleBattle) {
            cliLogger.info("No sample battle found");
            return;
        }

        cliLogger.info("📋 Sample battle structure:");
        cliLogger.info(`- Battle ID: ${sampleBattle.battle_id}`);
        cliLogger.info(`- Custom: ${sampleBattle.custom || false}`);
        cliLogger.info(
            `- Start/End: ${sampleBattle.start_time} to ${sampleBattle.end_time}`
        );
        cliLogger.info(`- Killmails: ${sampleBattle.killmailsCount || 0}`);
        cliLogger.info(
            `- ISK Destroyed: ${(
                sampleBattle.iskDestroyed || 0
            ).toLocaleString()}`
        );

        // Check systems
        cliLogger.info(
            `- Systems: ${sampleBattle.systems?.length || 0} systems involved`
        );
        if (sampleBattle.systems?.length) {
            cliLogger.info(
                `  First system: ${sampleBattle.systems[0].system_name} (${sampleBattle.systems[0].system_id})`
            );
        }

        // Check involved entities
        cliLogger.info(
            `- Involved Alliances: ${
                sampleBattle.alliancesInvolved?.length || 0
            }`
        );
        cliLogger.info(
            `- Involved Corporations: ${
                sampleBattle.corporationsInvolved?.length || 0
            }`
        );
        cliLogger.info(
            `- Involved Characters: ${
                sampleBattle.charactersInvolved?.length || 0
            }`
        );

        // Check top entities
        cliLogger.info(
            `- Top Alliances: ${sampleBattle.top_alliances?.length || 0}`
        );
        cliLogger.info(
            `- Top Corporations: ${sampleBattle.top_corporations?.length || 0}`
        );
        cliLogger.info(
            `- Top Ship Types: ${sampleBattle.top_ship_types?.length || 0}`
        );

        // Check killmails
        cliLogger.info(
            `- Killmail IDs: ${sampleBattle.killmail_ids?.length || 0}`
        );

        // Check sides (this is where the bulk data is)
        cliLogger.info(`- Sides: ${sampleBattle.side_ids?.length || 0} sides`);
        if (sampleBattle.sides && sampleBattle.side_ids?.length) {
            for (const sideId of sampleBattle.side_ids) {
                const side = sampleBattle.sides[sideId];
                if (side) {
                    cliLogger.info(`  Side "${sideId}" (${side.name}):`);
                    cliLogger.info(
                        `    - Alliances: ${side.alliances?.length || 0}`
                    );
                    cliLogger.info(
                        `    - Corporations: ${side.corporations?.length || 0}`
                    );
                    cliLogger.info(
                        `    - Kill IDs: ${side.kill_ids?.length || 0}`
                    );
                    cliLogger.info(
                        `    - Alliance Stats: ${
                            side.alliances_stats?.length || 0
                        }`
                    );
                    cliLogger.info(
                        `    - Corporation Stats: ${
                            side.corporations_stats?.length || 0
                        }`
                    );
                    cliLogger.info(
                        `    - Character Stats: ${
                            side.characters_stats?.length || 0
                        }`
                    );
                    cliLogger.info(
                        `    - Ship Manifest: ${
                            side.ship_manifest?.length || 0
                        }`
                    );

                    if (side.ship_manifest?.length) {
                        cliLogger.info(
                            `      First manifest entry: ${
                                side.ship_manifest[0].character_name ||
                                "Unknown"
                            } in ${side.ship_manifest[0].ship_name}`
                        );
                    }
                }
            }
        }

        // Calculate estimated records per battle
        let estimatedRelatedRecords = 0;
        if (sampleBattle.systems?.length)
            estimatedRelatedRecords += sampleBattle.systems.length;
        if (sampleBattle.alliancesInvolved?.length)
            estimatedRelatedRecords += sampleBattle.alliancesInvolved.length;
        if (sampleBattle.corporationsInvolved?.length)
            estimatedRelatedRecords += sampleBattle.corporationsInvolved.length;
        if (sampleBattle.charactersInvolved?.length)
            estimatedRelatedRecords += sampleBattle.charactersInvolved.length;
        if (sampleBattle.top_alliances?.length)
            estimatedRelatedRecords += sampleBattle.top_alliances.length;
        if (sampleBattle.top_corporations?.length)
            estimatedRelatedRecords += sampleBattle.top_corporations.length;
        if (sampleBattle.top_ship_types?.length)
            estimatedRelatedRecords += sampleBattle.top_ship_types.length;
        if (sampleBattle.killmail_ids?.length)
            estimatedRelatedRecords += sampleBattle.killmail_ids.length;

        // Add side data
        if (sampleBattle.sides && sampleBattle.side_ids?.length) {
            for (const sideId of sampleBattle.side_ids) {
                const side = sampleBattle.sides[sideId];
                if (side) {
                    estimatedRelatedRecords += 1; // The side itself
                    estimatedRelatedRecords += side.alliances?.length || 0;
                    estimatedRelatedRecords += side.corporations?.length || 0;
                    estimatedRelatedRecords += side.kill_ids?.length || 0;
                    estimatedRelatedRecords +=
                        side.alliances_stats?.length || 0;
                    estimatedRelatedRecords +=
                        side.corporations_stats?.length || 0;
                    estimatedRelatedRecords +=
                        side.characters_stats?.length || 0;
                    estimatedRelatedRecords += side.ship_manifest?.length || 0;
                }
            }
        }

        cliLogger.info(`\n📈 Estimated data explosion:`);
        cliLogger.info(
            `- 1 battle → ~${estimatedRelatedRecords} related records`
        );
        cliLogger.info(
            `- ${totalCount.toLocaleString()} battles → ~${(
                totalCount * estimatedRelatedRecords
            ).toLocaleString()} total records`
        );

        // Check if this is a large battle
        const isLargeBattle = estimatedRelatedRecords > 1000;
        if (isLargeBattle) {
            cliLogger.info(
                "⚠️  This appears to be a large battle with extensive data"
            );
        }

        // Get a few more samples to see variation
        const moreSamples = await Battles.find().limit(3).lean();
        if (moreSamples.length > 1) {
            cliLogger.info("\n📋 Size variation in battles:");
            moreSamples.forEach((battle, index) => {
                const sideCount = battle.side_ids?.length || 0;
                const totalManifest =
                    battle.sides && battle.side_ids
                        ? battle.side_ids.reduce((sum, sideId) => {
                              const side = battle.sides?.[sideId];
                              return sum + (side?.ship_manifest?.length || 0);
                          }, 0)
                        : 0;

                cliLogger.info(
                    `Battle ${
                        index + 1
                    }: ${sideCount} sides, ${totalManifest} ship manifest entries`
                );
            });
        }

        cliLogger.info("✅ Analysis completed successfully!");
    } catch (error) {
        cliLogger.error(`❌ Analysis failed: ${error}`);
        throw error;
    }
}

export default {
    name: "checkBattleData",
    description:
        "Analyze Battle data structure and estimate PostgreSQL records",
    longRunning: false,
    run: checkBattleData,
};
