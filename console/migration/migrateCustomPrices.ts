import { Prisma, PrismaClient } from "@prisma/client";
import { ObjectId } from "mongodb";
import { cliLogger } from "../../server/helpers/Logger";
import { CustomPrices as MongooseCustomPrices } from "../../server/models/CustomPrices";
import { MigrationHelper } from "./MigrationHelper";

const Decimal = Prisma.Decimal;

const prisma = new PrismaClient();

interface MongoCustomPrice {
    _id: ObjectId;
    type_id: number;
    price: number;
    date: Date;
    createdAt?: Date;
    updatedAt?: Date;
}

export async function migrateCustomPrices(
    force: boolean = false
): Promise<void> {
    try {
        cliLogger.info("Starting CustomPrices migration...");

        // Check if migration already exists
        const existingCount = await prisma.customPrice.count();
        if (existingCount > 0 && !force) {
            cliLogger.warn(
                `CustomPrices migration already exists (${existingCount} records). Use --force to re-run.`
            );
            return;
        }

        const totalCount = await MigrationHelper.getEstimatedCount(
            MongooseCustomPrices
        );
        cliLogger.info(
            `Estimated MongoDB CustomPrices records: ${totalCount.toLocaleString()}`
        );

        if (totalCount === 0) {
            cliLogger.info("No CustomPrices records to migrate");
            return;
        }

        // Clear existing data if force migration
        if (force && existingCount > 0) {
            cliLogger.info(
                "Force migration: clearing existing CustomPrices data..."
            );
            await prisma.customPrice.deleteMany();
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
            const batch = (await MongooseCustomPrices.find({})
                .skip(skip)
                .limit(batchSize)
                .lean()
                .exec()) as any[];

            if (batch.length === 0) {
                break;
            }

            const prismaData = batch.map((mongoPrice) => ({
                type_id: mongoPrice.type_id,
                price: new Decimal(mongoPrice.price),
                date: mongoPrice.date || new Date("2024-01-01"), // Default date for records without date
                created_at: mongoPrice.createdAt || new Date(),
                updated_at: mongoPrice.updatedAt || new Date(),
            }));

            await prisma.customPrice.createMany({
                data: prismaData,
                skipDuplicates: true,
            });

            processed += prismaData.length;
            skip += batchSize;

            // Log progress
            const progressPercent = ((processed / totalCount) * 100).toFixed(1);
            cliLogger.info(
                `Progress: ${processed}/${totalCount} (${progressPercent}%)`
            );
        }

        const finalCount = await prisma.customPrice.count();
        cliLogger.info(
            `✅ CustomPrices migration completed: ${finalCount.toLocaleString()} records migrated`
        );
    } catch (error) {
        cliLogger.error(`CustomPrices migration failed: ${error}`);
        throw error;
    } finally {
        await prisma.$disconnect();
    }
}
