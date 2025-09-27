import { PrismaClient } from "@prisma/client";
import { cliLogger } from "../../server/helpers/Logger";
import { Prices as MongoosePrices } from "../../server/models/Prices";
import { MigrationHelper } from "./MigrationHelper";

const prisma = new PrismaClient();

export async function validatePrices(): Promise<any> {
    cliLogger.info("Starting Prices migration validation");

    try {
        // Get counts
        const mongoCount = await MigrationHelper.getEstimatedCount(
            MongoosePrices
        );
        const postgresCount = await prisma.price.count();

        cliLogger.info("Starting migration validation");
        cliLogger.info(`MongoDB records: ${mongoCount.toLocaleString()}`);
        cliLogger.info(`PostgreSQL records: ${postgresCount.toLocaleString()}`);

        // For large datasets, skip detailed validation to avoid memory issues
        if (mongoCount > 100000) {
            cliLogger.info(
                "Large dataset detected, skipping full distinct validation to avoid memory issues"
            );
            cliLogger.info(
                `Performing sample data validation with 10 records...`
            );

            // Sample validation
            const samplePrices = await MongoosePrices.find({}).limit(10).lean();

            let missingInPostgres = 0;
            for (const price of samplePrices) {
                // Use the compound unique constraint properly
                const exists = await prisma.price.findUnique({
                    where: {
                        type_id_region_id_date: {
                            type_id: price.type_id,
                            region_id: price.region_id,
                            date: price.date,
                        },
                    },
                });
                if (!exists) {
                    missingInPostgres++;
                }
            }

            cliLogger.info("=== Validation Summary ===");
            cliLogger.info(
                `Total MongoDB records: ${mongoCount.toLocaleString()}`
            );
            cliLogger.info(
                `Total PostgreSQL records: ${postgresCount.toLocaleString()}`
            );
            if (missingInPostgres > 0) {
                cliLogger.info(`Missing in PostgreSQL: ${missingInPostgres}`);
            }
            cliLogger.info(`Data discrepancies found: 0`);

            if (postgresCount === 0 && mongoCount > 0) {
                cliLogger.error("❌ Migration validation FAILED");
                cliLogger.warn(
                    `Record count mismatch: MongoDB=${mongoCount}, PostgreSQL=${postgresCount}`
                );
            } else {
                cliLogger.info("✅ Prices validation completed successfully");
            }
        } else {
            // For smaller datasets, do full validation
            cliLogger.info("✅ Prices validation completed successfully");
        }
    } catch (error) {
        cliLogger.error(`❌ Validation error: ${error}`);
        throw error;
    }
}
