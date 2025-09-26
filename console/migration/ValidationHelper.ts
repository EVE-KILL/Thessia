import { cliLogger } from "../../server/helpers/Logger";
import { MigrationHelper } from "./MigrationHelper";

export interface ValidationResult {
    mongoCount: number;
    postgresCount: number;
    missingInPostgres: any[];
    dataDiscrepancies: Array<{
        id: number;
        field: string;
        mongoValue: any;
        postgresValue: any;
    }>;
    additionalData?: any;
}

export interface ValidationOptions {
    sampleSize?: number;
    skipDistinctForLargeDatasets?: boolean;
    largeDatasetThreshold?: number;
    fieldsToCompare?: string[];
    dateFields?: Array<{ field: string; tolerance?: number }>;
}

export class ValidationHelper {
    /**
     * Perform comprehensive validation between MongoDB and PostgreSQL data
     */
    static async validateMigration<TMongo, TPostgres>(
        mongoModel: any,
        postgresModel: any,
        idField: string,
        options: ValidationOptions = {}
    ): Promise<ValidationResult> {
        const {
            sampleSize = 50,
            skipDistinctForLargeDatasets = true,
            largeDatasetThreshold = 100000, // Lower threshold to 100k records
            fieldsToCompare = [],
            dateFields = [],
        } = options;

        cliLogger.info("Starting migration validation");

        const result: ValidationResult = {
            mongoCount: 0,
            postgresCount: 0,
            missingInPostgres: [],
            dataDiscrepancies: [],
        };

        try {
            // Get counts using estimated count for MongoDB (much faster)
            result.mongoCount = await MigrationHelper.getEstimatedCount(
                mongoModel
            );
            result.postgresCount = await postgresModel.count();

            cliLogger.info(
                `MongoDB records: ${result.mongoCount.toLocaleString()}`
            );
            cliLogger.info(
                `PostgreSQL records: ${result.postgresCount.toLocaleString()}`
            );

            // Skip expensive distinct operation for massive datasets
            if (
                skipDistinctForLargeDatasets &&
                result.mongoCount > largeDatasetThreshold
            ) {
                cliLogger.info(
                    "Large dataset detected, skipping full distinct validation to avoid memory issues"
                );
                result.missingInPostgres = []; // Will be populated during sample validation
            } else {
                // Check for missing records (only for smaller datasets)
                const mongoIds = await mongoModel.distinct(idField);
                const postgresRecords = await postgresModel.findMany({
                    select: { [idField]: true },
                });
                const postgresIds = postgresRecords.map((r: any) => r[idField]);

                result.missingInPostgres = mongoIds.filter(
                    (id: any) => !postgresIds.includes(id)
                );
            }

            if (result.missingInPostgres.length > 0) {
                cliLogger.warn(
                    `Found ${result.missingInPostgres.length} records missing in PostgreSQL`
                );
                cliLogger.warn(
                    `Missing IDs: ${result.missingInPostgres
                        .slice(0, 10)
                        .join(", ")}${
                        result.missingInPostgres.length > 10 ? "..." : ""
                    }`
                );
            }

            // Sample data validation
            const actualSampleSize =
                result.mongoCount > largeDatasetThreshold
                    ? Math.min(10, result.mongoCount)
                    : Math.min(sampleSize, result.mongoCount);
            cliLogger.info(
                `Performing sample data validation with ${actualSampleSize} records...`
            );

            const mongoSample = await mongoModel
                .find({})
                .limit(actualSampleSize)
                .lean()
                .exec();

            for (const mongoRecord of mongoSample) {
                const postgresRecord = await postgresModel.findUnique({
                    where: { [idField]: mongoRecord[idField] },
                });

                if (!postgresRecord) {
                    result.missingInPostgres.push(mongoRecord[idField]);
                    continue;
                }

                // Compare specified fields
                for (const field of fieldsToCompare) {
                    const mongoValue = MigrationHelper.normalizeValue(
                        mongoRecord[field],
                        field
                    );
                    const postgresValue = MigrationHelper.normalizeValue(
                        postgresRecord[field],
                        field
                    );

                    if (mongoValue !== postgresValue) {
                        result.dataDiscrepancies.push({
                            id: mongoRecord[idField],
                            field,
                            mongoValue,
                            postgresValue,
                        });
                    }
                }

                // Compare date fields with tolerance
                for (const dateFieldConfig of dateFields) {
                    const { field, tolerance = 1000 } = dateFieldConfig;
                    const mongoDate = mongoRecord[field];
                    const postgresDate = postgresRecord[field];

                    if (
                        !MigrationHelper.compareDates(
                            mongoDate,
                            postgresDate,
                            tolerance
                        )
                    ) {
                        result.dataDiscrepancies.push({
                            id: mongoRecord[idField],
                            field,
                            mongoValue: mongoDate,
                            postgresValue: postgresDate,
                        });
                    }
                }
            }

            // Summary
            this.logValidationSummary(result);

            return result;
        } catch (error) {
            cliLogger.error(`Error during validation: ${error}`);
            throw error;
        }
    }

    /**
     * Log validation summary
     */
    static logValidationSummary(result: ValidationResult) {
        cliLogger.info("=== Validation Summary ===");
        cliLogger.info(
            `Total MongoDB records: ${result.mongoCount.toLocaleString()}`
        );
        cliLogger.info(
            `Total PostgreSQL records: ${result.postgresCount.toLocaleString()}`
        );
        cliLogger.info(
            `Missing in PostgreSQL: ${result.missingInPostgres.length}`
        );
        cliLogger.info(
            `Data discrepancies found: ${result.dataDiscrepancies.length}`
        );

        if (result.dataDiscrepancies.length > 0) {
            cliLogger.warn("Sample discrepancies:");
            result.dataDiscrepancies.slice(0, 5).forEach((discrepancy) => {
                cliLogger.warn(
                    `ID ${discrepancy.id} - ${discrepancy.field}: Mongo="${discrepancy.mongoValue}" vs Postgres="${discrepancy.postgresValue}"`
                );
            });
        }

        const isValid =
            result.missingInPostgres.length === 0 &&
            result.dataDiscrepancies.length === 0;

        if (isValid) {
            cliLogger.info("✅ Migration validation PASSED");
        } else {
            cliLogger.error("❌ Migration validation FAILED");
        }
    }
}
