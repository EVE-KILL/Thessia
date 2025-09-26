import { PrismaClient } from "@prisma/client";
import { cliLogger } from "../../server/helpers/Logger";
import { Battles as MongooseBattles } from "../../server/models/Battles";
import { ValidationHelper } from "./ValidationHelper";

const prisma = new PrismaClient();

/**
 * Validates the Battles migration by comparing counts and sample data
 */
export async function validateBattles() {
    cliLogger.info("Starting Battles migration validation...");

    try {
        const result = await ValidationHelper.validateMigration(
            MongooseBattles,
            prisma.battle,
            "battle_id",
            {
                sampleSize: 10, // Smaller sample for battles due to JSON complexity
                skipDistinctForLargeDatasets: true,
                largeDatasetThreshold: 10000, // Skip distinct for large battle datasets
                fieldsToCompare: [
                    "battle_id",
                    "custom",
                    "start_time",
                    "end_time",
                    "duration_ms",
                    "killmails_count",
                    "isk_destroyed",
                ],
                dateFields: [
                    { field: "start_time", tolerance: 1000 },
                    { field: "end_time", tolerance: 1000 },
                ],
            }
        );

        if (result.missingInPostgres.length > 0) {
            cliLogger.warn(
                `Found ${result.missingInPostgres.length} battles missing in PostgreSQL`
            );
        }

        if (result.dataDiscrepancies.length > 0) {
            cliLogger.warn(
                `Found ${result.dataDiscrepancies.length} data discrepancies`
            );
        }

        // Additional JSON field validation
        await validateBattleJsonFields();

        cliLogger.info("✅ Battles validation completed successfully");
        return result;
    } catch (error: any) {
        cliLogger.error(`❌ Battles validation failed: ${error.message}`);
        throw error;
    }
}

/**
 * Validates that JSON fields contain expected data structures
 */
async function validateBattleJsonFields() {
    cliLogger.info("Validating battle JSON field structures...");

    // Sample a few battles to check JSON field integrity
    const sampleBattles = await prisma.battle.findMany({
        take: 5,
        orderBy: { killmails_count: "desc" },
    });

    for (const battle of sampleBattles) {
        try {
            // Validate systems JSON
            const systems = battle.systems as any;
            if (!Array.isArray(systems)) {
                cliLogger.warn(
                    `Battle ${battle.battle_id}: systems is not an array`
                );
                continue;
            }

            // Validate sides JSON
            const sides = battle.sides as any;
            if (typeof sides !== "object" || sides === null) {
                cliLogger.warn(
                    `Battle ${battle.battle_id}: sides is not an object`
                );
                continue;
            }

            // Validate killmail_ids JSON
            const killmailIds = battle.killmail_ids as any;
            if (!Array.isArray(killmailIds)) {
                cliLogger.warn(
                    `Battle ${battle.battle_id}: killmail_ids is not an array`
                );
                continue;
            }

            // Check that sides have expected structure
            for (const [sideKey, sideData] of Object.entries(sides)) {
                const side = sideData as any;
                if (!side.ship_manifest || !Array.isArray(side.ship_manifest)) {
                    cliLogger.warn(
                        `Battle ${battle.battle_id}, side ${sideKey}: missing or invalid ship_manifest`
                    );
                }
            }

            cliLogger.info(
                `✅ Battle ${battle.battle_id} JSON validation passed`
            );
        } catch (error: any) {
            cliLogger.warn(
                `Battle ${battle.battle_id} JSON validation error: ${error.message}`
            );
        }
    }

    cliLogger.info("JSON field validation completed");
}
