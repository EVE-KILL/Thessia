import prisma from "../../lib/prisma";
import { cliLogger } from "../../server/helpers/Logger";
import { Corporations } from "../../server/models/Corporations";
import { ValidationHelper } from "./ValidationHelper";

/**
 * Validate corporations migration
 */
export async function validateCorporations() {
    cliLogger.info("Starting Corporations migration validation...");

    try {
        const result = await ValidationHelper.validateMigration(
            Corporations,
            prisma.corporation,
            "corporation_id",
            {
                sampleSize: 20, // Higher sample size for corporations
                skipDistinctForLargeDatasets: true,
                largeDatasetThreshold: 50000, // Force skip distinct for corporations (966k records)
                fieldsToCompare: [
                    "corporation_id",
                    "name",
                    "ticker",
                    "description",
                    "url",
                    "date_founded",
                    "member_count",
                    "alliance_id",
                    "faction_id",
                    "home_station_id",
                    "shares",
                    "tax_rate",
                    "creator_id",
                    "ceo_id",
                    "war_eligible",
                    "deleted",
                    "error",
                ],
                dateFields: [
                    { field: "created_at", tolerance: 2000 },
                    { field: "updated_at", tolerance: 2000 },
                    { field: "date_founded", tolerance: 2000 },
                ],
            }
        );

        cliLogger.info("✅ Corporations validation completed!");
        return result;
    } catch (error) {
        cliLogger.error(`❌ Corporations validation failed: ${error}`);
        throw error;
    }
}
