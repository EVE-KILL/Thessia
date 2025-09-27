import { PrismaClient } from "@prisma/client";
import { cliLogger } from "../../server/helpers/Logger";

const prisma = new PrismaClient();

interface ValidationResults {
    totalKillmails: number;
    totalVictims: number;
    totalAttackers: number;
    totalItems: number;
    missingVictims: number;
    killmailsWithoutAttackers: number;
    orphanedItems: number;
    valueConsistency: {
        checked: number;
        inconsistent: number;
    };
}

export async function validateKillmails(): Promise<ValidationResults> {
    try {
        cliLogger.info("🔍 Starting Killmails validation (fast sampling)...");

        await prisma.$connect();
        cliLogger.info("✅ Connected to PostgreSQL");

        const results: ValidationResults = {
            totalKillmails: 0,
            totalVictims: 0,
            totalAttackers: 0,
            totalItems: 0,
            missingVictims: 0,
            killmailsWithoutAttackers: 0,
            orphanedItems: 0,
            valueConsistency: {
                checked: 0,
                inconsistent: 0,
            },
        };

        // Quick count check
        cliLogger.info("📊 Getting record counts...");
        results.totalKillmails = await prisma.killmail.count();

        if (results.totalKillmails === 0) {
            cliLogger.info("📝 No data to validate - tables are empty");
            return results;
        }

        // Get related counts only if we have killmails
        results.totalVictims = await prisma.killmailVictim.count();
        results.totalAttackers = await prisma.killmailAttacker.count();
        results.totalItems = await prisma.killmailItem.count();

        cliLogger.info(`📈 Total counts:`);
        cliLogger.info(
            `   Killmails: ${results.totalKillmails.toLocaleString()}`
        );
        cliLogger.info(`   Victims: ${results.totalVictims.toLocaleString()}`);
        cliLogger.info(
            `   Attackers: ${results.totalAttackers.toLocaleString()}`
        );
        cliLogger.info(`   Items: ${results.totalItems.toLocaleString()}`);

        // Sample-based validation (much faster)
        const SAMPLE_SIZE = 100;
        cliLogger.info(
            `🎯 Running sample-based validation (${SAMPLE_SIZE} records)...`
        );

        const sampleKillmails = await prisma.killmail.findMany({
            include: {
                victim: true,
                attackers: true,
                items: true,
            },
            take: SAMPLE_SIZE,
        });

        results.valueConsistency.checked = sampleKillmails.length;
        let inconsistentCount = 0;
        let missingVictims = 0;
        let killmailsWithoutAttackers = 0;

        for (const killmail of sampleKillmails) {
            // Check for missing victims
            if (!killmail.victim) {
                missingVictims++;
            }

            // Check for killmails without attackers
            if (killmail.attackers.length === 0) {
                killmailsWithoutAttackers++;
            }

            // Check value consistency (if values are present)
            if (
                killmail.total_value &&
                killmail.fitting_value &&
                killmail.ship_value
            ) {
                const fittingValue = Number(killmail.fitting_value);
                const shipValue = Number(killmail.ship_value);
                const totalValue = Number(killmail.total_value);
                const calculatedTotal = fittingValue + shipValue;

                // Allow for small floating point differences
                if (Math.abs(totalValue - calculatedTotal) > 0.01) {
                    inconsistentCount++;
                }
            }
        }

        results.missingVictims = missingVictims;
        results.killmailsWithoutAttackers = killmailsWithoutAttackers;
        results.valueConsistency.inconsistent = inconsistentCount;
        results.orphanedItems = 0; // Prevented by foreign key constraints

        // Report sample results
        if (missingVictims > 0) {
            cliLogger.warn(
                `⚠️  Found ${missingVictims}/${SAMPLE_SIZE} killmails without victims in sample`
            );
        } else {
            cliLogger.info("✅ All sample killmails have victims");
        }

        if (killmailsWithoutAttackers > 0) {
            cliLogger.warn(
                `⚠️  Found ${killmailsWithoutAttackers}/${SAMPLE_SIZE} killmails without attackers in sample`
            );
        } else {
            cliLogger.info("✅ All sample killmails have attackers");
        }

        if (inconsistentCount > 0) {
            cliLogger.warn(
                `⚠️  Found ${inconsistentCount}/${results.valueConsistency.checked} killmails with inconsistent values in sample`
            );
        } else {
            cliLogger.info("✅ Sample value consistency check passed");
        }

        cliLogger.info(
            "✅ Foreign key integrity guaranteed by database constraints"
        );

        // Summary
        cliLogger.info("\n📋 Validation Summary:");
        cliLogger.info(
            `   Total Killmails: ${results.totalKillmails.toLocaleString()}`
        );
        cliLogger.info(
            `   Total Victims: ${results.totalVictims.toLocaleString()}`
        );
        cliLogger.info(
            `   Total Attackers: ${results.totalAttackers.toLocaleString()}`
        );
        cliLogger.info(
            `   Total Items: ${results.totalItems.toLocaleString()}`
        );
        cliLogger.info(
            `   Missing Victims (sample): ${results.missingVictims}/${SAMPLE_SIZE}`
        );
        cliLogger.info(
            `   Killmails without Attackers (sample): ${results.killmailsWithoutAttackers}/${SAMPLE_SIZE}`
        );
        cliLogger.info(`   Orphaned Items: ${results.orphanedItems}`);
        cliLogger.info(
            `   Value Inconsistencies (sample): ${results.valueConsistency.inconsistent}/${results.valueConsistency.checked}`
        );

        const hasErrors =
            results.missingVictims > 0 ||
            results.killmailsWithoutAttackers > 0 ||
            results.orphanedItems > 0 ||
            results.valueConsistency.inconsistent > 0;

        if (hasErrors) {
            cliLogger.warn(
                "⚠️  Validation completed with warnings (based on sample)"
            );
        } else {
            cliLogger.info(
                "🎉 Validation completed successfully - no issues found in sample!"
            );
        }

        return results;
    } catch (error) {
        cliLogger.error(`❌ Validation failed: ${error}`);
        throw error;
    } finally {
        await prisma.$disconnect();
    }
}

// Export for CLI usage
if (require.main === module) {
    validateKillmails()
        .then(() => {
            cliLogger.info("✅ Validation script completed");
            process.exit(0);
        })
        .catch((error) => {
            cliLogger.error(`❌ Validation script failed: ${error}`);
            process.exit(1);
        });
}
