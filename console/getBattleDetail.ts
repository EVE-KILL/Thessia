import prisma from "../lib/prisma";
import { cliLogger } from "../server/helpers/Logger";

async function getBattleDetail() {
    cliLogger.info("=== Full Battle Data Analysis ===");

    try {
        // Get a larger battle with more data
        const largeBattle = await prisma.battle.findFirst({
            where: {
                killmails_count: { gt: 50 }
            }
        });

        if (!largeBattle) {
            cliLogger.info("No large battles found, getting any battle...");
            const anyBattle = await prisma.battle.findFirst();
            if (anyBattle) {
                // Convert BigInt to string for JSON serialization
                const serialized = JSON.stringify(anyBattle, (key, value) =>
                    typeof value === 'bigint' ? value.toString() : value
                , 2);
                cliLogger.info(serialized);
            }
            return;
        }

        // Convert BigInt to string for JSON serialization
        const serialized = JSON.stringify(largeBattle, (key, value) =>
            typeof value === 'bigint' ? value.toString() : value
        , 2);

        cliLogger.info(
            `Found battle ${largeBattle.battle_id} with ${largeBattle.killmails_count} killmails`
        );
        cliLogger.info("=== FULL BATTLE DATA ===");
        cliLogger.info(serialized);

        // Analyze the structure
        cliLogger.info("\n=== STRUCTURE ANALYSIS ===");
        cliLogger.info(`Battle ID: ${largeBattle.battle_id}`);
        cliLogger.info(`Custom: ${largeBattle.custom}`);
        cliLogger.info(`Duration: ${largeBattle.duration_ms}ms`);
        cliLogger.info(`Killmails: ${largeBattle.killmails_count}`);
        cliLogger.info(`ISK: ${largeBattle.isk_destroyed}`);

        const systems = largeBattle.systems as any[];
        if (systems && Array.isArray(systems)) {
            cliLogger.info(`Systems: ${systems.length}`);
            systems.forEach((sys, i) => {
                cliLogger.info(`  ${i}: ${JSON.stringify(sys)}`);
            });
        }

        const sides = largeBattle.sides as any;
        if (sides) {
             cliLogger.info(`Sides content: ${JSON.stringify(sides, null, 2)}`);
        }

    } catch (error) {
        cliLogger.error(`❌ Analysis failed: ${error}`);
        throw error;
    }
}

export default {
    name: "getBattleDetail",
    description: "Get full detail of a battle record for schema optimization",
    longRunning: false,
    run: getBattleDetail,
};
