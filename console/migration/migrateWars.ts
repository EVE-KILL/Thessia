import { PrismaClient } from "@prisma/client";
import { ObjectId } from "mongodb";
import { cliLogger } from "../../server/helpers/Logger";
import { Wars as MongooseWars } from "../../server/models/Wars";
import { MigrationHelper } from "./MigrationHelper";

const prisma = new PrismaClient();

interface MongoWar {
    _id: ObjectId;
    war_id: number;
    declared: Date;
    started: Date;
    finished?: Date;
    retracted?: Date;
    mutual: boolean;
    open_for_allies: boolean;
    aggressor: {
        corporation_id?: number;
        alliance_id?: number;
        isk_destroyed: number;
        ships_killed: number;
    };
    defender: {
        corporation_id?: number;
        alliance_id?: number;
        isk_destroyed: number;
        ships_killed: number;
    };
    allies?: Array<{
        corporation_id?: number;
        alliance_id?: number;
    }>;
    createdAt?: Date;
    updatedAt?: Date;
}

export async function migrateWars(force: boolean = false): Promise<void> {
    try {
        cliLogger.info("Starting Wars migration...");

        // Check if migration already exists
        const existingCount = await prisma.war.count();
        if (existingCount > 0 && !force) {
            cliLogger.warn(
                `Wars migration already exists (${existingCount} records). Use --force to re-run.`
            );
            return;
        }

        const totalCount = await MigrationHelper.getEstimatedCount(
            MongooseWars
        );
        cliLogger.info(
            `Estimated MongoDB Wars records: ${totalCount.toLocaleString()}`
        );

        if (totalCount === 0) {
            cliLogger.info("No Wars records to migrate");
            return;
        }

        // Clear existing data if force migration
        if (force && existingCount > 0) {
            cliLogger.info("Force migration: clearing existing Wars data...");
            await prisma.war.deleteMany();
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
            const batch = (await MongooseWars.find({})
                .skip(skip)
                .limit(batchSize)
                .lean()
                .exec()) as any[];

            if (batch.length === 0) {
                break;
            }

            const operations = batch.map((mongoWar) => ({
                war_id: mongoWar.war_id,
                declared: mongoWar.declared,
                started: mongoWar.started,
                finished: mongoWar.finished || null,
                retracted: mongoWar.retracted || null,
                mutual: mongoWar.mutual || false,
                open_for_allies: mongoWar.open_for_allies || false,

                // Aggressor details
                aggressor_corporation_id:
                    mongoWar.aggressor?.corporation_id || null,
                aggressor_alliance_id: mongoWar.aggressor?.alliance_id || null,
                aggressor_isk_destroyed: BigInt(
                    Math.floor(Number(mongoWar.aggressor?.isk_destroyed || 0))
                ),
                aggressor_ships_killed: Number(
                    mongoWar.aggressor?.ships_killed || 0
                ),

                // Defender details
                defender_corporation_id:
                    mongoWar.defender?.corporation_id || null,
                defender_alliance_id: mongoWar.defender?.alliance_id || null,
                defender_isk_destroyed: BigInt(
                    Math.floor(Number(mongoWar.defender?.isk_destroyed || 0))
                ),
                defender_ships_killed: Number(
                    mongoWar.defender?.ships_killed || 0
                ),

                // Allies as JSON
                allies: mongoWar.allies || null,

                created_at: mongoWar.createdAt || new Date(),
                updated_at: mongoWar.updatedAt || new Date(),
            }));

            await prisma.war.createMany({
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

        const finalCount = await prisma.war.count();
        cliLogger.info(
            `✅ Wars migration completed: ${finalCount.toLocaleString()} records migrated`
        );
    } catch (error) {
        cliLogger.error(`Wars migration failed: ${error}`);
        throw error;
    } finally {
        await prisma.$disconnect();
    }
}
