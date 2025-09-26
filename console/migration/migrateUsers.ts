import { PrismaClient } from "@prisma/client";
import { cliLogger } from "../../server/helpers/Logger";
import { Users as MongooseUsers } from "../../server/models/Users";
import { MigrationHelper } from "./MigrationHelper";

const prisma = new PrismaClient();

interface MongoUser {
    _id: any;
    accessToken: string;
    dateExpiration: Date;
    refreshToken: string;
    characterId: number;
    characterName: string;
    scopes: string[];
    tokenType: string;
    characterOwnerHash: string;
    uniqueIdentifier: string;
    lastChecked?: Date;
    canFetchCorporationKillmails?: boolean;
    esiActive?: boolean;
    administrator?: boolean;
    settings?: any[];
    createdAt?: Date;
    updatedAt?: Date;
}

export async function migrateUsers(force: boolean = false): Promise<void> {
    cliLogger.info("Starting Users migration...");

    try {
        // Check existing data
        const existingCount = await prisma.user.count();

        if (existingCount > 0 && !force) {
            cliLogger.warn(
                `Users migration already exists (${existingCount} records). Use --force to re-run.`
            );
            return;
        }

        const totalCount = await MigrationHelper.getEstimatedCount(
            MongooseUsers
        );
        cliLogger.info(
            `Estimated MongoDB Users records: ${totalCount.toLocaleString()}`
        );

        if (totalCount === 0) {
            cliLogger.info("No Users records to migrate");
            return;
        }

        // Clear existing data if force migration
        if (force && existingCount > 0) {
            cliLogger.info("Force migration: clearing existing Users data...");
            await prisma.user.deleteMany();
        }

        const batchSize = 1000;
        await MigrationHelper.processBatches<MongoUser>(
            MongooseUsers,
            totalCount,
            batchSize,
            async (
                batch: MongoUser[],
                batchNumber: number,
                totalBatches: number
            ) => {
                const transformedUsers = batch.map((user) => ({
                    access_token: user.accessToken,
                    date_expiration: user.dateExpiration,
                    refresh_token: user.refreshToken,
                    character_id: user.characterId,
                    character_name: user.characterName,
                    scopes: user.scopes || [],
                    token_type: user.tokenType,
                    character_owner_hash: user.characterOwnerHash,
                    unique_identifier: user.uniqueIdentifier,
                    last_checked: user.lastChecked || new Date(),
                    can_fetch_corporation_killmails:
                        user.canFetchCorporationKillmails ?? true,
                    esi_active: user.esiActive ?? true,
                    role: user.administrator
                        ? ("admin" as const)
                        : ("user" as const),
                    settings: user.settings
                        ? JSON.parse(JSON.stringify(user.settings))
                        : null,
                    created_at: user.createdAt || new Date(),
                    updated_at: user.updatedAt || new Date(),
                }));

                await prisma.user.createMany({
                    data: transformedUsers,
                    skipDuplicates: true,
                });
            },
            { batchSize, logProgress: true, skipDuplicates: true }
        );

        const finalCount = await prisma.user.count();
        cliLogger.info(
            `Users migration completed! Migrated ${finalCount.toLocaleString()} records`
        );
    } catch (error) {
        cliLogger.error(`Users migration failed: ${error}`);
        throw error;
    }
}
