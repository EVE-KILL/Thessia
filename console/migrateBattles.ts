import { PrismaClient } from "@prisma/client";
import { ObjectId } from "mongodb";
import { cliLogger } from "../server/helpers/Logger";
import type { IBattlesDocument } from "../server/models/Battles";
import { Battles as MongooseBattles } from "../server/models/Battles";
import { MigrationHelper } from "./migration/MigrationHelper";

const prisma = new PrismaClient();

interface MongoBattles {
    _id: ObjectId;
    battle_id: number;
    custom?: boolean;
    start_time: Date;
    end_time: Date;
    duration_ms?: number;
    systems?: Array<{
        system_id: number;
        system_name: string;
        system_security: number;
        region_id: number;
        region_name: any;
    }>;
    killmailsCount: number;
    iskDestroyed: number;
    alliancesInvolved: number[];
    corporationsInvolved: number[];
    charactersInvolved: number[];
    involved_alliances_count?: number;
    involved_corporations_count?: number;
    involved_characters_count?: number;
    top_alliances?: Array<{
        id: number;
        name: string | Record<string, string>;
        count: number;
    }>;
    top_corporations?: Array<{
        id: number;
        name: string | Record<string, string>;
        count: number;
    }>;
    top_ship_types?: Array<{
        id: number;
        name: string | Record<string, string>;
        count: number;
    }>;
    killmail_ids?: number[];
    side_ids?: string[];
    sides?: Record<
        string,
        {
            id: string;
            name: string;
            alliances: Array<{ id: number; name?: string }>;
            corporations: Array<{ id: number; name?: string }>;
            kill_ids: number[];
            stats: {
                iskLost: number;
                shipsLost: number;
                damageInflicted: number;
            };
            alliances_stats: Array<{
                id: number;
                name: string;
                alliance_id?: number;
                alliance_name?: string;
                kills: number;
                losses: number;
                valueInflicted: number;
                valueSuffered: number;
            }>;
            corporations_stats: Array<{
                id: number;
                name: string;
                alliance_id?: number;
                alliance_name?: string;
                kills: number;
                losses: number;
                valueInflicted: number;
                valueSuffered: number;
            }>;
            characters_stats: Array<{
                id: number;
                name: string;
                alliance_id?: number;
                alliance_name?: string;
                kills: number;
                losses: number;
                valueInflicted: number;
                valueSuffered: number;
            }>;
            ship_manifest: Array<{
                character_id?: number;
                character_name?: string;
                corporation_id?: number;
                corporation_name?: string;
                alliance_id?: number;
                alliance_name?: string;
                ship_type_id: number;
                ship_name: any;
                ship_group_id?: number;
                ship_group_name?: any;
                was_lost: boolean;
                killmail_id_if_lost?: number;
                damage_taken?: number;
                damage_dealt?: number;
            }>;
        }
    >;
    createdAt?: Date;
    updatedAt?: Date;
}

/**
 * Migrates battles from MongoDB to PostgreSQL with full normalization
 */
export async function migrateBattles(): Promise<void> {
    const migrationHelper = new MigrationHelper<IBattlesDocument, MongoBattles>(
        "Battles",
        MongooseBattles,
        async (battles) => {
            for (const battle of battles) {
                await migrateSingleBattle(battle);
            }
        }
    );

    await migrationHelper.migrate();
}

/**
 * Migrates a single battle with all related data
 */
async function migrateSingleBattle(battle: MongoBattles): Promise<void> {
    const battleId = battle.battle_id;

    try {
        // Insert main battle record
        const createdBattle = await prisma.battle.create({
            data: {
                battle_id: battleId,
                custom: battle.custom || false,
                start_time: battle.start_time,
                end_time: battle.end_time,
                duration_ms: battle.duration_ms,
                killmails_count: battle.killmailsCount,
                isk_destroyed: battle.iskDestroyed,
                involved_alliances_count:
                    battle.involved_alliances_count ||
                    battle.alliancesInvolved?.length ||
                    0,
                involved_corporations_count:
                    battle.involved_corporations_count ||
                    battle.corporationsInvolved?.length ||
                    0,
                involved_characters_count:
                    battle.involved_characters_count ||
                    battle.charactersInvolved?.length ||
                    0,
                created_at: battle.createdAt || new Date(),
                updated_at: battle.updatedAt || new Date(),
            },
        });

        // Migrate battle systems
        if (battle.systems && battle.systems.length > 0) {
            for (const system of battle.systems) {
                await prisma.battleSystem.create({
                    data: {
                        battle_id: battleId,
                        system_id: system.system_id,
                        system_name: system.system_name,
                        system_security: system.system_security,
                        region_id: system.region_id,
                        region_name: normalizeTranslation(system.region_name),
                    },
                });
            }
        }

        // Migrate involved entities (alliances, corporations, characters)
        if (battle.alliancesInvolved?.length > 0) {
            const allianceData = battle.alliancesInvolved.map((allianceId) => ({
                battle_id: battleId,
                alliance_id: allianceId,
            }));
            await prisma.battleInvolvedAlliance.createMany({
                data: allianceData,
            });
        }

        if (battle.corporationsInvolved?.length > 0) {
            const corporationData = battle.corporationsInvolved.map(
                (corpId) => ({
                    battle_id: battleId,
                    corporation_id: corpId,
                })
            );
            await prisma.battleInvolvedCorporation.createMany({
                data: corporationData,
            });
        }

        if (battle.charactersInvolved?.length > 0) {
            const characterData = battle.charactersInvolved.map((charId) => ({
                battle_id: battleId,
                character_id: charId,
            }));
            await prisma.battleInvolvedCharacter.createMany({
                data: characterData,
            });
        }

        // Migrate top entities
        if (battle.top_alliances?.length > 0) {
            for (const topAlliance of battle.top_alliances) {
                await prisma.battleTopAlliance.create({
                    data: {
                        battle_id: battleId,
                        alliance_id: topAlliance.id,
                        name: normalizeTranslation(topAlliance.name),
                        count: topAlliance.count,
                    },
                });
            }
        }

        if (battle.top_corporations?.length > 0) {
            for (const topCorp of battle.top_corporations) {
                await prisma.battleTopCorporation.create({
                    data: {
                        battle_id: battleId,
                        corporation_id: topCorp.id,
                        name: normalizeTranslation(topCorp.name),
                        count: topCorp.count,
                    },
                });
            }
        }

        if (battle.top_ship_types?.length > 0) {
            for (const topShip of battle.top_ship_types) {
                await prisma.battleTopShipType.create({
                    data: {
                        battle_id: battleId,
                        ship_type_id: topShip.id,
                        name: normalizeTranslation(topShip.name),
                        count: topShip.count,
                    },
                });
            }
        }

        // Migrate killmail associations
        if (battle.killmail_ids?.length > 0) {
            const killmailData = battle.killmail_ids.map((killmailId) => ({
                battle_id: battleId,
                killmail_id: killmailId,
            }));
            await prisma.battleKillmail.createMany({ data: killmailData });
        }

        // Migrate sides and all side-related data
        if (battle.sides && battle.side_ids?.length > 0) {
            for (const sideId of battle.side_ids) {
                const sideData = battle.sides[sideId];
                if (!sideData) continue;

                // Create the side
                const createdSide = await prisma.battleSide.create({
                    data: {
                        battle_id: battleId,
                        side_id: sideId,
                        name: sideData.name,
                        isk_lost: sideData.stats.iskLost,
                        ships_lost: sideData.stats.shipsLost,
                        damage_inflicted: sideData.stats.damageInflicted,
                    },
                });

                // Migrate side alliances
                if (sideData.alliances?.length > 0) {
                    for (const alliance of sideData.alliances) {
                        await prisma.battleSideAlliance.create({
                            data: {
                                battle_id: battleId,
                                side_id: sideId,
                                alliance_id: alliance.id,
                                name: alliance.name,
                            },
                        });
                    }
                }

                // Migrate side corporations
                if (sideData.corporations?.length > 0) {
                    for (const corp of sideData.corporations) {
                        await prisma.battleSideCorporation.create({
                            data: {
                                battle_id: battleId,
                                side_id: sideId,
                                corporation_id: corp.id,
                                name: corp.name,
                            },
                        });
                    }
                }

                // Migrate side killmails
                if (sideData.kill_ids?.length > 0) {
                    const sideKillmailData = sideData.kill_ids.map(
                        (killId) => ({
                            battle_id: battleId,
                            side_id: sideId,
                            killmail_id: killId,
                        })
                    );
                    await prisma.battleSideKillmail.createMany({
                        data: sideKillmailData,
                    });
                }

                // Migrate alliance stats
                if (sideData.alliances_stats?.length > 0) {
                    for (const allianceStat of sideData.alliances_stats) {
                        await prisma.battleSideAllianceStats.create({
                            data: {
                                battle_id: battleId,
                                side_id: sideId,
                                alliance_id: allianceStat.id,
                                name: allianceStat.name,
                                kills: allianceStat.kills,
                                losses: allianceStat.losses,
                                value_inflicted: allianceStat.valueInflicted,
                                value_suffered: allianceStat.valueSuffered,
                            },
                        });
                    }
                }

                // Migrate corporation stats
                if (sideData.corporations_stats?.length > 0) {
                    for (const corpStat of sideData.corporations_stats) {
                        await prisma.battleSideCorporationStats.create({
                            data: {
                                battle_id: battleId,
                                side_id: sideId,
                                corporation_id: corpStat.id,
                                name: corpStat.name,
                                alliance_id: corpStat.alliance_id,
                                alliance_name: corpStat.alliance_name,
                                kills: corpStat.kills,
                                losses: corpStat.losses,
                                value_inflicted: corpStat.valueInflicted,
                                value_suffered: corpStat.valueSuffered,
                            },
                        });
                    }
                }

                // Migrate character stats
                if (sideData.characters_stats?.length > 0) {
                    for (const charStat of sideData.characters_stats) {
                        await prisma.battleSideCharacterStats.create({
                            data: {
                                battle_id: battleId,
                                side_id: sideId,
                                character_id: charStat.id,
                                name: charStat.name,
                                corporation_id: charStat.alliance_id, // Note: Mongoose model might have mixed up alliance_id
                                corporation_name: charStat.alliance_name,
                                alliance_id: charStat.alliance_id,
                                alliance_name: charStat.alliance_name,
                                kills: charStat.kills,
                                losses: charStat.losses,
                                value_inflicted: charStat.valueInflicted,
                                value_suffered: charStat.valueSuffered,
                            },
                        });
                    }
                }

                // Migrate ship manifest
                if (sideData.ship_manifest?.length > 0) {
                    for (const manifest of sideData.ship_manifest) {
                        await prisma.battleSideShipManifest.create({
                            data: {
                                battle_id: battleId,
                                side_id: sideId,
                                character_id: manifest.character_id,
                                character_name: manifest.character_name,
                                corporation_id: manifest.corporation_id,
                                corporation_name: manifest.corporation_name,
                                alliance_id: manifest.alliance_id,
                                alliance_name: manifest.alliance_name,
                                ship_type_id: manifest.ship_type_id,
                                ship_name: normalizeTranslation(
                                    manifest.ship_name
                                ),
                                ship_group_id: manifest.ship_group_id,
                                ship_group_name: normalizeTranslation(
                                    manifest.ship_group_name
                                ),
                                was_lost: manifest.was_lost,
                                killmail_id_if_lost:
                                    manifest.killmail_id_if_lost,
                                damage_taken: manifest.damage_taken,
                                damage_dealt: manifest.damage_dealt,
                            },
                        });
                    }
                }
            }
        }

        cliLogger.success(`Successfully migrated battle ${battleId}`);
    } catch (error) {
        cliLogger.error(`Error migrating battle ${battleId}: ${error}`);
        throw error;
    }
}

/**
 * Normalizes translation objects to JSON strings for PostgreSQL storage
 */
function normalizeTranslation(value: any): string | null {
    if (!value) return null;
    if (typeof value === "string") return value;
    if (typeof value === "object" && value.en) return value.en;
    if (typeof value === "object") return JSON.stringify(value);
    return String(value);
}

export default {
    name: "migrate-battles",
    description: "Migrate battles from MongoDB to PostgreSQL",
    longRunning: true,
    options: [],
    run: migrateBattles,
};

// Run if called directly
if (require.main === module) {
    migrateBattles()
        .then(() => {
            cliLogger.info("✅ Battles migration completed successfully");
            process.exit(0);
        })
        .catch((error) => {
            cliLogger.error(`❌ Battles migration failed: ${error}`);
            process.exit(1);
        });
}
