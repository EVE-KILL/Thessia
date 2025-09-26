import { PrismaClient } from "@prisma/client";
import { cliLogger } from "../../server/helpers/Logger";
import { Stats as MongooseStats } from "../../server/models/Stats";
import { ValidationHelper } from "./ValidationHelper";

const prisma = new PrismaClient();

export async function validateStats(): Promise<any> {
    cliLogger.info("Starting Stats migration validation");

    try {
        const result = await ValidationHelper.validateMigration(
            MongooseStats,
            prisma.stats,
            "id", // ID field to compare
            {
                sampleSize: 10,
                skipDistinctForLargeDatasets: true,
                largeDatasetThreshold: 1000,
                fieldsToCompare: ["id", "type", "kills_total", "losses_total"],
                dateFields: [
                    { field: "last_calculated", tolerance: 2000 },
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
                    `ID ${disc.id} - ${disc.field}: MongoDB="${disc.mongoValue}" vs PostgreSQL="${disc.postgresValue}"`
                );
            });
        }

        return result;
    } catch (error) {
        cliLogger.error(`Stats validation failed: ${error}`);
        throw error;
    }
}
