import { PrismaClient } from "@prisma/client";
import { ObjectId } from "mongodb";
import { cliLogger } from "../../server/helpers/Logger";
import { Prices as MongoosePrices } from "../../server/models/Prices";
import { MigrationHelper } from "./MigrationHelper";

const prisma = new PrismaClient();

interface MongoPrice {
    _id: ObjectId;
    type_id: number;
    average?: number;
    highest?: number;
    lowest?: number;
    region_id: number;
    order_count?: number;
    volume?: number;
    date: Date;
    createdAt?: Date;
    updatedAt?: Date;
}

export async function migratePrices(force: boolean = false): Promise<void> {
    try {
        cliLogger.info("Starting Prices migration...");

        // Check if migration already exists
        const existingCount = await prisma.price.count();
        if (existingCount > 0 && !force) {
            cliLogger.warn(
                `Prices migration already exists (${existingCount} records). Use --force to re-run.`
            );
            return;
        }

        const totalCount = await MigrationHelper.getEstimatedCount(
            MongoosePrices
        );
        cliLogger.info(
            `Estimated MongoDB Prices records: ${totalCount.toLocaleString()}`
        );

        if (totalCount === 0) {
            cliLogger.info("No Prices records to migrate");
            return;
        }

        // Clear existing data if force migration
        if (force && existingCount > 0) {
            cliLogger.info("Force migration: clearing existing Prices data...");
            await prisma.price.deleteMany();
        }

        let processed = 0;
        const batchSize = 10000;

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
            const batch = (await MongoosePrices.find({})
                .skip(skip)
                .limit(batchSize)
                .lean()
                .exec()) as any[];

            if (batch.length === 0) {
                break;
            }

            const operations = batch.map((mongoPrice) => ({
                type_id: mongoPrice.type_id,
                average: mongoPrice.average || null,
                highest: mongoPrice.highest || null,
                lowest: mongoPrice.lowest || null,
                region_id: mongoPrice.region_id,
                order_count: mongoPrice.order_count || null,
                volume: mongoPrice.volume || null,
                date: mongoPrice.date,
                created_at: mongoPrice.createdAt || new Date(),
                updated_at: mongoPrice.updatedAt || new Date(),
            }));

            await prisma.price.createMany({
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

        const finalCount = await prisma.price.count();
        cliLogger.info(
            `✅ Prices migration completed: ${finalCount.toLocaleString()} records migrated`
        );
    } catch (error) {
        cliLogger.error(`Prices migration failed: ${error}`);
        throw error;
    } finally {
        await prisma.$disconnect();
    }
}
