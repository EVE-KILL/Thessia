import { PrismaClient } from "@prisma/client";
import { ObjectId } from "mongodb";
import { cliLogger } from "../../server/helpers/Logger";
import { Comments as MongooseComments } from "../../server/models/Comments";
import { MigrationHelper } from "./MigrationHelper";

const prisma = new PrismaClient();

interface MongoComment {
    _id: ObjectId;
    identifier: string;
    killIdentifier: string;
    comment: string;
    characterId: number;
    characterName: string;
    corporationId: number;
    corporationName: string;
    allianceId?: number;
    allianceName?: string;
    deleted?: boolean;
    reported?: boolean;
    reportMessages?: any[];
    createdAt?: Date;
    updatedAt?: Date;
}

export async function migrateComments(force: boolean = false): Promise<void> {
    try {
        cliLogger.info("Starting Comments migration...");

        // Check if migration already exists
        const existingCount = await prisma.comment.count();
        if (existingCount > 0 && !force) {
            cliLogger.warn(
                `Comments migration already exists (${existingCount} records). Use --force to re-run.`
            );
            return;
        }

        const totalCount = await MigrationHelper.getEstimatedCount(
            MongooseComments
        );
        cliLogger.info(
            `Estimated MongoDB Comments records: ${totalCount.toLocaleString()}`
        );

        if (totalCount === 0) {
            cliLogger.info("No Comments records to migrate");
            return;
        }

        // Clear existing data if force migration
        if (force && existingCount > 0) {
            cliLogger.info(
                "Force migration: clearing existing Comments data..."
            );
            await prisma.comment.deleteMany();
        }

        let processed = 0;
        const batchSize = 1000;

        // Process in batches using standard pattern
        let skip = 0;
        while (skip < totalCount) {
            const batchNumber = Math.floor(skip / batchSize) + 1;
            const totalBatches = Math.ceil(totalCount / batchSize);

            cliLogger.info(
                `Processing batch ${batchNumber}/${totalBatches} - Records ${skip}-${Math.min(
                    skip + batchSize,
                    totalCount
                )}`
            );

            // Fetch batch from MongoDB
            const batch = (await MongooseComments.find({})
                .skip(skip)
                .limit(batchSize)
                .lean()
                .exec()) as any[];

            if (batch.length === 0) {
                break;
            }

            const operations = batch.map((mongoComment) => ({
                identifier: mongoComment.identifier,
                kill_identifier: mongoComment.killIdentifier,
                comment: mongoComment.comment,
                character_id: mongoComment.characterId,
                corporation_id: mongoComment.corporationId,
                corporation_name: mongoComment.corporationName,
                alliance_id: mongoComment.allianceId || null,
                alliance_name: mongoComment.allianceName || null,
                deleted: mongoComment.deleted || false,
                reported: mongoComment.reported || false,
                report_messages: mongoComment.reportMessages || null,
                created_at: mongoComment.createdAt || new Date(),
                updated_at: mongoComment.updatedAt || new Date(),
            }));

            await prisma.comment.createMany({
                data: operations,
                skipDuplicates: true,
            });

            processed += operations.length;
            skip += batchSize;

            // Log progress
            const progressPercent = ((processed / totalCount) * 100).toFixed(1);
            cliLogger.info(
                `Progress: ${processed}/${totalCount} (${progressPercent}%)`
            );
        }

        const finalCount = await prisma.comment.count();
        cliLogger.info(
            `✅ Comments migration completed: ${finalCount.toLocaleString()} records migrated`
        );
    } catch (error) {
        cliLogger.error(`Comments migration failed: ${error}`);
        throw error;
    } finally {
        await prisma.$disconnect();
    }
}
