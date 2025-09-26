import prisma from "../../lib/prisma";
import { Comments } from "../../server/models/Comments";
import { ValidationHelper, type ValidationResult } from "./ValidationHelper";

export async function validateComments(): Promise<ValidationResult> {
    return await ValidationHelper.validateMigration(
        Comments,
        prisma.comment,
        "identifier", // Comments use unique identifier field
        {
            sampleSize: 10,
            skipDistinctForLargeDatasets: false, // Comments dataset is small
            fieldsToCompare: [
                "kill_identifier", // Note: field mapping difference
                "comment",
                "character_id", // Note: field mapping difference
                "character_name",
                "corporation_id",
                "corporation_name",
                "alliance_id",
                "alliance_name",
                "deleted",
                "reported",
            ],
            dateFields: [
                { field: "createdAt", tolerance: 2000 },
                { field: "updatedAt", tolerance: 2000 },
            ],
        }
    );
}
