import prisma from "../../lib/prisma";
import { cliLogger } from "../../server/helpers/Logger";
import { Characters } from "../../server/models/Characters";
import { ValidationHelper, type ValidationResult } from "./ValidationHelper";

type MongoCharacterLean = {
    character_id: number;
    name?: string;
    description?: string;
    birthday?: Date;
    gender?: string;
    race_id?: number;
    security_status?: number;
    bloodline_id?: number;
    corporation_id?: number;
    alliance_id?: number;
    faction_id?: number;
    history?: Array<{
        record_id?: number;
        corporation_id: number;
        start_date?: Date;
    }>;
    deleted?: boolean;
    error?: string;
    last_active?: Date;
    createdAt?: Date;
    updatedAt?: Date;
};

interface CharacterValidationResult extends ValidationResult {
    mongoHistoryCount: number;
    postgresHistoryCount: number;
    historyDiscrepancies: Array<{
        character_id: number;
        mongoHistoryCount: number;
        postgresHistoryCount: number;
    }>;
}

export async function validateCharacters(): Promise<CharacterValidationResult> {
    // Use the helper for basic validation
    const baseResult = await ValidationHelper.validateMigration<
        MongoCharacterLean,
        any
    >(Characters, prisma.character, "character_id", {
        sampleSize: 50,
        skipDistinctForLargeDatasets: true,
        largeDatasetThreshold: 1000000,
        fieldsToCompare: [
            "name",
            "description",
            "gender",
            "race_id",
            "security_status",
            "bloodline_id",
            "corporation_id",
            "alliance_id",
            "faction_id",
            "deleted",
            "error",
        ],
        dateFields: [
            { field: "birthday", tolerance: 86400000 }, // 1 day tolerance
            { field: "last_active", tolerance: 1000 }, // 1 second tolerance
        ],
    });

    // Add character-specific validation for history records
    let mongoHistoryCount = 0;
    let postgresHistoryCount = 0;
    const historyDiscrepancies: Array<{
        character_id: number;
        mongoHistoryCount: number;
        postgresHistoryCount: number;
    }> = [];

    try {
        // Count history records with optimization for large datasets
        if (baseResult.mongoCount > 1000000) {
            cliLogger.info(
                "Large dataset detected, skipping MongoDB history count to avoid timeout"
            );
            mongoHistoryCount = -1; // Indicate we couldn't count
        } else {
            try {
                const mongoHistoryAggregate = await Characters.aggregate(
                    [
                        {
                            $unwind: {
                                path: "$history",
                                preserveNullAndEmptyArrays: true,
                            },
                        },
                        { $match: { history: { $ne: null } } },
                        { $count: "total" },
                    ],
                    { allowDiskUse: true }
                );
                mongoHistoryCount = mongoHistoryAggregate[0]?.total || 0;
            } catch (error) {
                cliLogger.warn(
                    `Could not count MongoDB history records: ${error}`
                );
                mongoHistoryCount = -1;
            }
        }

        postgresHistoryCount = await prisma.characterHistory.count();

        cliLogger.info(
            `MongoDB history records: ${
                mongoHistoryCount === -1
                    ? "Unknown (large dataset)"
                    : mongoHistoryCount.toLocaleString()
            }`
        );
        cliLogger.info(
            `PostgreSQL history records: ${postgresHistoryCount.toLocaleString()}`
        );

        // Validate history counts for sample characters
        const sampleSize = baseResult.mongoCount > 1000000 ? 10 : 50;
        const mongoSample = await Characters.find({})
            .limit(sampleSize)
            .lean<MongoCharacterLean[]>()
            .exec();

        for (const mongoCharacter of mongoSample) {
            const postgresCharacter = await prisma.character.findUnique({
                where: { character_id: mongoCharacter.character_id },
                include: { history: true },
            });

            if (postgresCharacter) {
                const mongoHistoryCount = mongoCharacter.history?.length || 0;
                const postgresHistoryCount = postgresCharacter.history.length;

                if (mongoHistoryCount !== postgresHistoryCount) {
                    historyDiscrepancies.push({
                        character_id: mongoCharacter.character_id,
                        mongoHistoryCount,
                        postgresHistoryCount,
                    });
                }
            }
        }

        if (historyDiscrepancies.length > 0) {
            cliLogger.warn("Sample history discrepancies:");
            historyDiscrepancies.slice(0, 5).forEach((discrepancy) => {
                cliLogger.warn(
                    `Character ${discrepancy.character_id} - History count: Mongo=${discrepancy.mongoHistoryCount} vs Postgres=${discrepancy.postgresHistoryCount}`
                );
            });
        }
    } catch (error) {
        cliLogger.error(`Error during character history validation: ${error}`);
    }

    // Create extended result
    const result: CharacterValidationResult = {
        ...baseResult,
        mongoHistoryCount,
        postgresHistoryCount,
        historyDiscrepancies,
    };

    // Update validation status considering history discrepancies
    const isValid =
        result.missingInPostgres.length === 0 &&
        result.dataDiscrepancies.length === 0 &&
        result.historyDiscrepancies.length === 0;

    if (isValid) {
        cliLogger.info("✅ Character migration validation PASSED");
    } else {
        cliLogger.error("❌ Character migration validation FAILED");
    }

    return result;
}
