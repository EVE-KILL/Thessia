import { PrismaClient } from "@prisma/client";
import { cliLogger } from "../server/helpers/Logger";
import type { IBattlesDocument } from "../server/models/Battles";
import { Battles as MongooseBattles } from "../server/models/Battles";
import { ValidationHelper } from "./migration/ValidationHelper";

const prisma = new PrismaClient();

/**
 * Validates the Battles migration by comparing counts and sample data
 */
export async function validateBattles(): Promise<void> {
    const validationHelper = new ValidationHelper(
        "Battles",
        MongooseBattles,
        async () => await prisma.battle.count(),
        async () => await validateBattleSampleData()
    );

    await validationHelper.validate();
}

/**
 * Validates sample battle data between MongoDB and PostgreSQL
 */
async function validateBattleSampleData(): Promise<boolean> {
    try {
        // Get sample battles from both databases
        const mongoBattles = (await MongooseBattles.find({})
            .sort({ start_time: -1 })
            .limit(10)
            .lean()) as IBattlesDocument[];

        if (mongoBattles.length === 0) {
            cliLogger.info("No battles found in MongoDB to validate");
            return true;
        }

        let validationsPassed = 0;
        const totalValidations = mongoBattles.length;

        for (const mongoBattle of mongoBattles) {
            const battleId = mongoBattle.battle_id;

            // Get PostgreSQL battle with all related data
            const postgresBattle = await prisma.battle.findUnique({
                where: { battle_id: battleId },
                include: {
                    systems: true,
                    involved_alliances: true,
                    involved_corporations: true,
                    involved_characters: true,
                    top_alliances: true,
                    top_corporations: true,
                    top_ship_types: true,
                    killmails: true,
                    sides: {
                        include: {
                            alliances: true,
                            corporations: true,
                            killmails: true,
                            alliance_stats: true,
                            corporation_stats: true,
                            character_stats: true,
                            ship_manifest: true,
                        },
                    },
                },
            });

            if (!postgresBattle) {
                cliLogger.error(
                    `❌ Battle ${battleId} not found in PostgreSQL`
                );
                continue;
            }

            // Validate basic battle data
            const isBasicValid = validateBasicBattleData(
                mongoBattle,
                postgresBattle
            );
            if (!isBasicValid) continue;

            // Validate counts
            const isCountsValid = validateBattleCounts(
                mongoBattle,
                postgresBattle
            );
            if (!isCountsValid) continue;

            // Validate systems
            const isSystemsValid = validateBattleSystems(
                mongoBattle,
                postgresBattle
            );
            if (!isSystemsValid) continue;

            // Validate involved entities
            const isEntitiesValid = validateInvolvedEntities(
                mongoBattle,
                postgresBattle
            );
            if (!isEntitiesValid) continue;

            // Validate killmails
            const isKillmailsValid = validateBattleKillmails(
                mongoBattle,
                postgresBattle
            );
            if (!isKillmailsValid) continue;

            // Validate sides (complex nested structure)
            const isSidesValid = validateBattleSides(
                mongoBattle,
                postgresBattle
            );
            if (!isSidesValid) continue;

            validationsPassed++;
            cliLogger.success(`✅ Battle ${battleId} validation passed`);
        }

        const successRate = (validationsPassed / totalValidations) * 100;
        cliLogger.info(
            `Battle validation completed: ${validationsPassed}/${totalValidations} passed (${successRate.toFixed(
                1
            )}%)`
        );

        return validationsPassed === totalValidations;
    } catch (error) {
        cliLogger.error("Error during battle sample validation:", error);
        return false;
    }
}

/**
 * Validates basic battle data fields
 */
function validateBasicBattleData(
    mongo: IBattlesDocument,
    postgres: any
): boolean {
    const battleId = mongo.battle_id;

    // Check required fields
    if (postgres.battle_id !== mongo.battle_id) {
        cliLogger.error(`❌ Battle ${battleId}: battle_id mismatch`);
        return false;
    }

    if (postgres.custom !== (mongo.custom || false)) {
        cliLogger.error(`❌ Battle ${battleId}: custom flag mismatch`);
        return false;
    }

    if (postgres.start_time?.getTime() !== mongo.start_time?.getTime()) {
        cliLogger.error(`❌ Battle ${battleId}: start_time mismatch`);
        return false;
    }

    if (postgres.end_time?.getTime() !== mongo.end_time?.getTime()) {
        cliLogger.error(`❌ Battle ${battleId}: end_time mismatch`);
        return false;
    }

    if (postgres.duration_ms !== mongo.duration_ms) {
        cliLogger.error(`❌ Battle ${battleId}: duration_ms mismatch`);
        return false;
    }

    if (postgres.killmails_count !== mongo.killmailsCount) {
        cliLogger.error(`❌ Battle ${battleId}: killmails_count mismatch`);
        return false;
    }

    if (postgres.isk_destroyed !== mongo.iskDestroyed) {
        cliLogger.error(`❌ Battle ${battleId}: isk_destroyed mismatch`);
        return false;
    }

    return true;
}

/**
 * Validates entity counts
 */
function validateBattleCounts(mongo: IBattlesDocument, postgres: any): boolean {
    const battleId = mongo.battle_id;

    const expectedAllianceCount =
        mongo.involved_alliances_count || mongo.alliancesInvolved?.length || 0;
    if (postgres.involved_alliances_count !== expectedAllianceCount) {
        cliLogger.error(
            `❌ Battle ${battleId}: alliance count mismatch (${postgres.involved_alliances_count} vs ${expectedAllianceCount})`
        );
        return false;
    }

    const expectedCorpCount =
        mongo.involved_corporations_count ||
        mongo.corporationsInvolved?.length ||
        0;
    if (postgres.involved_corporations_count !== expectedCorpCount) {
        cliLogger.error(`❌ Battle ${battleId}: corporation count mismatch`);
        return false;
    }

    const expectedCharCount =
        mongo.involved_characters_count ||
        mongo.charactersInvolved?.length ||
        0;
    if (postgres.involved_characters_count !== expectedCharCount) {
        cliLogger.error(`❌ Battle ${battleId}: character count mismatch`);
        return false;
    }

    return true;
}

/**
 * Validates battle systems
 */
function validateBattleSystems(
    mongo: IBattlesDocument,
    postgres: any
): boolean {
    const battleId = mongo.battle_id;
    const mongoSystems = mongo.systems || [];
    const postgresSystems = postgres.systems || [];

    if (mongoSystems.length !== postgresSystems.length) {
        cliLogger.error(
            `❌ Battle ${battleId}: systems count mismatch (${postgresSystems.length} vs ${mongoSystems.length})`
        );
        return false;
    }

    return true;
}

/**
 * Validates involved entities
 */
function validateInvolvedEntities(
    mongo: IBattlesDocument,
    postgres: any
): boolean {
    const battleId = mongo.battle_id;

    // Check involved alliances count
    const mongoAlliancesCount = mongo.alliancesInvolved?.length || 0;
    const postgresAlliancesCount = postgres.involved_alliances?.length || 0;
    if (mongoAlliancesCount !== postgresAlliancesCount) {
        cliLogger.error(
            `❌ Battle ${battleId}: involved alliances count mismatch (${postgresAlliancesCount} vs ${mongoAlliancesCount})`
        );
        return false;
    }

    // Check involved corporations count
    const mongoCorpsCount = mongo.corporationsInvolved?.length || 0;
    const postgresCorpsCount = postgres.involved_corporations?.length || 0;
    if (mongoCorpsCount !== postgresCorpsCount) {
        cliLogger.error(
            `❌ Battle ${battleId}: involved corporations count mismatch (${postgresCorpsCount} vs ${mongoCorpsCount})`
        );
        return false;
    }

    // Check involved characters count
    const mongoCharsCount = mongo.charactersInvolved?.length || 0;
    const postgresCharsCount = postgres.involved_characters?.length || 0;
    if (mongoCharsCount !== postgresCharsCount) {
        cliLogger.error(
            `❌ Battle ${battleId}: involved characters count mismatch (${postgresCharsCount} vs ${mongoCharsCount})`
        );
        return false;
    }

    return true;
}

/**
 * Validates battle killmails
 */
function validateBattleKillmails(
    mongo: IBattlesDocument,
    postgres: any
): boolean {
    const battleId = mongo.battle_id;
    const mongoKillmailsCount = mongo.killmail_ids?.length || 0;
    const postgresKillmailsCount = postgres.killmails?.length || 0;

    if (mongoKillmailsCount !== postgresKillmailsCount) {
        cliLogger.error(
            `❌ Battle ${battleId}: killmails count mismatch (${postgresKillmailsCount} vs ${mongoKillmailsCount})`
        );
        return false;
    }

    return true;
}

/**
 * Validates battle sides and their complex nested data
 */
function validateBattleSides(mongo: IBattlesDocument, postgres: any): boolean {
    const battleId = mongo.battle_id;
    const mongoSidesCount = mongo.side_ids?.length || 0;
    const postgresSidesCount = postgres.sides?.length || 0;

    if (mongoSidesCount !== postgresSidesCount) {
        cliLogger.error(
            `❌ Battle ${battleId}: sides count mismatch (${postgresSidesCount} vs ${mongoSidesCount})`
        );
        return false;
    }

    // Validate each side's data
    for (const postgresSide of postgres.sides || []) {
        const mongoSideData = mongo.sides?.[postgresSide.side_id];
        if (!mongoSideData) {
            cliLogger.error(
                `❌ Battle ${battleId}: side ${postgresSide.side_id} not found in MongoDB`
            );
            return false;
        }

        // Validate side stats
        if (postgresSide.isk_lost !== mongoSideData.stats.iskLost) {
            cliLogger.error(
                `❌ Battle ${battleId} Side ${postgresSide.side_id}: isk_lost mismatch`
            );
            return false;
        }

        if (postgresSide.ships_lost !== mongoSideData.stats.shipsLost) {
            cliLogger.error(
                `❌ Battle ${battleId} Side ${postgresSide.side_id}: ships_lost mismatch`
            );
            return false;
        }

        // Validate nested data counts
        const mongoAllianceStats = mongoSideData.alliances_stats?.length || 0;
        const postgresAllianceStats = postgresSide.alliance_stats?.length || 0;
        if (mongoAllianceStats !== postgresAllianceStats) {
            cliLogger.error(
                `❌ Battle ${battleId} Side ${postgresSide.side_id}: alliance stats count mismatch`
            );
            return false;
        }

        const mongoCorpStats = mongoSideData.corporations_stats?.length || 0;
        const postgresCorpStats = postgresSide.corporation_stats?.length || 0;
        if (mongoCorpStats !== postgresCorpStats) {
            cliLogger.error(
                `❌ Battle ${battleId} Side ${postgresSide.side_id}: corporation stats count mismatch`
            );
            return false;
        }

        const mongoCharStats = mongoSideData.characters_stats?.length || 0;
        const postgresCharStats = postgresSide.character_stats?.length || 0;
        if (mongoCharStats !== postgresCharStats) {
            cliLogger.error(
                `❌ Battle ${battleId} Side ${postgresSide.side_id}: character stats count mismatch`
            );
            return false;
        }

        const mongoManifest = mongoSideData.ship_manifest?.length || 0;
        const postgresManifest = postgresSide.ship_manifest?.length || 0;
        if (mongoManifest !== postgresManifest) {
            cliLogger.error(
                `❌ Battle ${battleId} Side ${postgresSide.side_id}: ship manifest count mismatch`
            );
            return false;
        }
    }

    return true;
}

export default {
    name: "validate-battles",
    description: "Validate battles migration from MongoDB to PostgreSQL",
    longRunning: true,
    options: [],
    run: validateBattles,
};

// Run if called directly
if (require.main === module) {
    validateBattles()
        .then(() => {
            cliLogger.info("✅ Battles validation completed");
            process.exit(0);
        })
        .catch((error) => {
            cliLogger.error(`❌ Battles validation failed: ${error}`);
            process.exit(1);
        });
}
