import prisma from "../../lib/prisma";
import { Alliances } from "../../server/models/Alliances";
import { ValidationHelper, type ValidationResult } from "./ValidationHelper";

// Use the ValidationResult from the helper

export async function validateAlliances(): Promise<ValidationResult> {
    return await ValidationHelper.validateMigration(
        Alliances,
        prisma.alliance,
        "alliance_id",
        {
            sampleSize: 50,
            skipDistinctForLargeDatasets: false, // Alliances dataset is small enough
            fieldsToCompare: [
                "name",
                "ticker",
                "executor_corporation_id",
                "creator_id",
                "creator_corporation_id",
                "faction_id",
                "closed",
            ],
            dateFields: [
                { field: "dateFounded", tolerance: 86400000 }, // 1 day tolerance for date fields
            ],
        }
    );
}
