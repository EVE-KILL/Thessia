import { PrismaClient } from "@prisma/client";
import { cliLogger } from "../../server/helpers/Logger";
import { Users as MongooseUsers } from "../../server/models/Users";
import { MigrationHelper } from "./MigrationHelper";

const prisma = new PrismaClient();

export async function validateUsers(): Promise<any> {
    cliLogger.info("Starting Users migration validation");

    try {
        // Get counts
        const mongoCount = await MigrationHelper.getEstimatedCount(
            MongooseUsers
        );
        const postgresCount = await prisma.user.count();

        cliLogger.info(`MongoDB Users records: ${mongoCount.toLocaleString()}`);
        cliLogger.info(
            `PostgreSQL users records: ${postgresCount.toLocaleString()}`
        );

        // Check count mismatch
        if (mongoCount !== postgresCount) {
            cliLogger.warn(
                `Record count mismatch: MongoDB=${mongoCount}, PostgreSQL=${postgresCount}`
            );
        }

        // Sample validation with correct field mapping
        const sampleSize = Math.min(10, mongoCount);
        if (sampleSize > 0) {
            cliLogger.info(`Validating ${sampleSize} sample records...`);

            const mongoSample = await MongooseUsers.find({})
                .limit(sampleSize)
                .lean()
                .exec();

            let validationIssues = 0;

            for (const mongoRecord of mongoSample as any[]) {
                // Use character_id for PostgreSQL lookup (field mapping)
                const postgresRecord = await prisma.user.findUnique({
                    where: {
                        character_id: mongoRecord.characterId, // MongoDB field -> PostgreSQL field
                    },
                });

                if (!postgresRecord) {
                    cliLogger.warn(
                        `Missing record in PostgreSQL: character_id=${mongoRecord.characterId}`
                    );
                    validationIssues++;
                    continue;
                }

                // Validate key fields with proper mapping
                if (
                    mongoRecord.characterName !== postgresRecord.character_name
                ) {
                    cliLogger.warn(
                        `Character name mismatch for character_id=${mongoRecord.characterId}: MongoDB="${mongoRecord.characterName}" vs PostgreSQL="${postgresRecord.character_name}"`
                    );
                    validationIssues++;
                }

                if (mongoRecord.role !== postgresRecord.role) {
                    cliLogger.warn(
                        `Role mismatch for character_id=${mongoRecord.characterId}: MongoDB="${mongoRecord.role}" vs PostgreSQL="${postgresRecord.role}"`
                    );
                    validationIssues++;
                }
            }

            if (validationIssues === 0) {
                cliLogger.info("✅ Sample validation passed!");
            } else {
                cliLogger.warn(
                    `❌ Found ${validationIssues} validation issues in sample`
                );
            }
        }

        const isValid = mongoCount === postgresCount;

        cliLogger.info(
            isValid
                ? "✅ Users validation completed successfully!"
                : "❌ Users validation found issues"
        );

        return {
            isValid,
            mongoCount,
            postgresCount,
            sampledRecords: sampleSize,
            countMismatch: mongoCount !== postgresCount,
        };
    } catch (error) {
        cliLogger.error(`Error during validation: ${error}`);
        throw error;
    } finally {
        await prisma.$disconnect();
    }
}
