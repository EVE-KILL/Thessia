import prisma from "../../lib/prisma";
import { Wars } from "../../server/models/Wars";
import { ValidationHelper, type ValidationResult } from "./ValidationHelper";

export async function validateWars(): Promise<ValidationResult> {
    return await ValidationHelper.validateMigration(
        Wars,
        prisma.war,
        "war_id",
        {
            sampleSize: 20, // Larger sample for this big dataset
            skipDistinctForLargeDatasets: true, // Wars dataset is large (750K+)
            fieldsToCompare: [
                "declared",
                "started",
                "finished",
                "mutual",
                "open_for_allies",
            ],
            dateFields: [
                { field: "declared", tolerance: 2000 },
                { field: "started", tolerance: 2000 },
                { field: "finished", tolerance: 2000 },
                { field: "retracted", tolerance: 2000 },
                { field: "createdAt", tolerance: 2000 },
                { field: "updatedAt", tolerance: 2000 },
            ],
        }
    );
}
