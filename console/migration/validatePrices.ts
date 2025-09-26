import { PrismaClient } from "@prisma/client";
import { cliLogger } from "../../server/helpers/Logger";
import { Prices as MongoosePrices } from "../../server/models/Prices";
import { ValidationHelper } from "./ValidationHelper";

const prisma = new PrismaClient();

export async function validatePrices(): Promise<any> {
    cliLogger.info("Starting Prices migration validation");

    try {
        const result = await ValidationHelper.validateMigration(
            MongoosePrices,
            prisma.price,
            "type_id", // Primary comparison field
            {
                sampleSize: 20, // Larger sample for price data
                skipDistinctForLargeDatasets: true,
                largeDatasetThreshold: 100000, // Prices dataset is huge
                fieldsToCompare: [
                    "type_id",
                    "region_id",
                    "average",
                    "highest",
                    "lowest",
                    "order_count",
                    "volume",
                ],
                dateFields: [
                    { field: "date", tolerance: 86400000 }, // 1 day tolerance for date fields
                    { field: "created_at", tolerance: 2000 },
                    { field: "updated_at", tolerance: 2000 },
                ],
            }
        );

        if (result.mongoCount !== result.postgresCount) {
            cliLogger.warn(
                `Record count mismatch: MongoDB=${result.mongoCount}, PostgreSQL=${result.postgresCount}`
            );
        }

        if (result.dataDiscrepancies.length > 0) {
            cliLogger.warn(
                `Found ${result.dataDiscrepancies.length} data discrepancies (showing first 5):`
            );
            result.dataDiscrepancies.slice(0, 5).forEach((disc) => {
                cliLogger.warn(
                    `Type ID ${disc.id} - ${disc.field}: MongoDB="${disc.mongoValue}" vs PostgreSQL="${disc.postgresValue}"`
                );
            });
        }

        // Additional validation for price data
        const samplePrices = await prisma.price.findMany({
            take: 10,
            select: {
                type_id: true,
                average: true,
                highest: true,
                lowest: true,
                region_id: true,
            },
        });

        let priceValidationIssues = 0;
        for (const price of samplePrices) {
            // Validate price relationships
            if (price.average && price.highest && price.lowest) {
                if (
                    price.average > price.highest ||
                    price.average < price.lowest
                ) {
                    priceValidationIssues++;
                }
                if (price.lowest > price.highest) {
                    priceValidationIssues++;
                }
            }
        }

        if (priceValidationIssues > 0) {
            cliLogger.warn(
                `Found ${priceValidationIssues} price relationship validation issues in sample`
            );
        } else {
            cliLogger.info(
                "Price relationship validation passed for sample data"
            );
        }

        return result;
    } catch (error) {
        cliLogger.error(`Prices validation failed: ${error}`);
        throw error;
    }
}
