import mongoose from "mongoose";
import { cliLogger } from "../server/helpers/Logger";
import { Battles } from "../server/models/Battles";

async function getBattleDetail() {
    cliLogger.info("=== Full Battle Data Analysis ===");

    try {
        // Get a larger battle with more data
        const largeBattle = await Battles.findOne({
            killmailsCount: { $gt: 50 }, // Find a battle with 50+ killmails
        })
            .lean()
            .exec();

        if (!largeBattle) {
            cliLogger.info("No large battles found, getting any battle...");
            const anyBattle = await Battles.findOne().lean().exec();
            if (anyBattle) {
                cliLogger.info(JSON.stringify(anyBattle, null, 2));
            }
            return;
        }

        cliLogger.info(
            `Found battle ${largeBattle.battle_id} with ${largeBattle.killmailsCount} killmails`
        );
        cliLogger.info("=== FULL BATTLE DATA ===");
        cliLogger.info(JSON.stringify(largeBattle, null, 2));

        // Analyze the structure
        cliLogger.info("\n=== STRUCTURE ANALYSIS ===");
        cliLogger.info(`Battle ID: ${largeBattle.battle_id}`);
        cliLogger.info(`Custom: ${largeBattle.custom}`);
        cliLogger.info(`Duration: ${largeBattle.duration_ms}ms`);
        cliLogger.info(`Killmails: ${largeBattle.killmailsCount}`);
        cliLogger.info(`ISK: ${largeBattle.iskDestroyed}`);

        if (largeBattle.systems) {
            cliLogger.info(`Systems: ${largeBattle.systems.length}`);
            largeBattle.systems.forEach((sys, i) => {
                cliLogger.info(`  ${i}: ${JSON.stringify(sys)}`);
            });
        }

        if (largeBattle.sides && largeBattle.side_ids) {
            cliLogger.info(`\nSides: ${largeBattle.side_ids.length}`);
            largeBattle.side_ids.forEach((sideId) => {
                const side = largeBattle.sides![sideId];
                cliLogger.info(`  Side ${sideId}:`);
                cliLogger.info(`    Name: ${side.name}`);
                cliLogger.info(`    Stats: ${JSON.stringify(side.stats)}`);
                cliLogger.info(`    Alliances: ${side.alliances?.length || 0}`);
                cliLogger.info(
                    `    Corporations: ${side.corporations?.length || 0}`
                );
                cliLogger.info(`    Kill IDs: ${side.kill_ids?.length || 0}`);
                cliLogger.info(
                    `    Alliance Stats: ${side.alliances_stats?.length || 0}`
                );
                cliLogger.info(
                    `    Corp Stats: ${side.corporations_stats?.length || 0}`
                );
                cliLogger.info(
                    `    Char Stats: ${side.characters_stats?.length || 0}`
                );
                cliLogger.info(
                    `    Ship Manifest: ${side.ship_manifest?.length || 0}`
                );

                if (
                    side.ship_manifest?.length &&
                    side.ship_manifest.length > 0
                ) {
                    cliLogger.info(
                        `    Sample manifest entry: ${JSON.stringify(
                            side.ship_manifest[0]
                        )}`
                    );
                }
            });
        }
    } catch (error) {
        cliLogger.error(`❌ Analysis failed: ${error}`);
        throw error;
    } finally {
        await mongoose.disconnect();
    }
}

export default {
    name: "getBattleDetail",
    description: "Get full detail of a battle record for schema optimization",
    longRunning: false,
    run: getBattleDetail,
};
