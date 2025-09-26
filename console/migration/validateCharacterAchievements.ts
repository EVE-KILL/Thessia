import { PrismaClient } from "@prisma/client";
import { CharacterAchievements } from "../../server/models/CharacterAchievements";
import { ValidationHelper } from "./ValidationHelper";

const prisma = new PrismaClient();

export const validateCharacterAchievements = async () => {
    await ValidationHelper.validateMigration(
        "character achievements",
        async () => CharacterAchievements.countDocuments(),
        async () => prisma.characterAchievements.count()
    );
};
