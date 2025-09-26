import { PrismaClient } from "@prisma/client";
import { cliLogger } from "../../server/helpers/Logger";
import { CustomPrices as MongooseCustomPrices } from "../../server/models/CustomPrices";
import { MigrationHelper } from "./MigrationHelper";

const prisma = new PrismaClient();

export async function validateCustomPrices(): Promise<any> {
    cliLogger.info("Starting CustomPrices migration validation");

    try {
        // Get counts
        const mongoCount = await MigrationHelper.getEstimatedCount(
            MongooseCustomPrices
        );
        const postgresCount = await prisma.customPrice.count();

        cliLogger.info(
            `MongoDB CustomPrices records: ${mongoCount.toLocaleString()}`
        );
        cliLogger.info(
            `PostgreSQL CustomPrices records: ${postgresCount.toLocaleString()}`
        );

        // Basic count validation
        if (mongoCount !== postgresCount) {
            cliLogger.warn(
                `Record count mismatch: MongoDB=${mongoCount}, PostgreSQL=${postgresCount}`
            );
        } else {
            cliLogger.info("✅ Record counts match");
        }

        // Sample data validation for CustomPrices with composite key
        const sampleSize = Math.min(10, mongoCount);
        if (sampleSize > 0) {
            cliLogger.info(
                `Performing sample data validation with ${sampleSize} records...`
            );

            const mongoSample = await MongooseCustomPrices.find({})
                .limit(sampleSize)
                .lean()
                .exec();

            let validationIssues = 0;

            for (const mongoRecord of mongoSample) {
                // Validate that required fields exist
                if (!mongoRecord.type_id || !mongoRecord.date) {
                    cliLogger.warn(
                        `Invalid MongoDB record: type_id=${mongoRecord.type_id}, date=${mongoRecord.date}`
                    );
                    validationIssues++;
                    continue;
                }

                // Use composite unique key for lookup
                const postgresRecord = await prisma.customPrice.findUnique({
                    where: {
                        type_id_date: {
                            type_id: mongoRecord.type_id,
                            date: new Date(mongoRecord.date), // Ensure proper Date object
                        },
                    },
                });

                if (!postgresRecord) {
                    cliLogger.warn(
                        `Missing record in PostgreSQL: type_id=${mongoRecord.type_id}, date=${mongoRecord.date}`
                    );
                    validationIssues++;
                    continue;
                }

                // Compare key fields
                if (
                    Math.abs(
                        parseFloat(mongoRecord.price.toString()) -
                            parseFloat(postgresRecord.price.toString())
                    ) > 0.01
                ) {
                    cliLogger.warn(
                        `Price mismatch for type_id=${mongoRecord.type_id}: MongoDB=${mongoRecord.price} vs PostgreSQL=${postgresRecord.price}`
                    );
                    validationIssues++;
                }
            }

            if (validationIssues === 0) {
                cliLogger.info("✅ Sample data validation passed");
            } else {
                cliLogger.warn(
                    `⚠️  Found ${validationIssues} validation issues in sample data`
                );
            }
        }

        return {
            mongoCount,
            postgresCount,
            validationIssues: mongoCount !== postgresCount ? 1 : 0,
        };
    } catch (error) {
        cliLogger.error(`CustomPrices validation failed: ${error}`);
        throw error;
    }
}
