import type {
    Killmail,
    KillmailAttacker,
    KillmailItem,
    KillmailVictim,
    Prisma,
} from "@prisma/client";
import prisma from "~/lib/prisma";
import type {
    IESIKillmail,
    IESIVictim,
    IESIAttacker,
} from "../interfaces/IESIKillmail";

export interface KillmailSearchFilters {
    killmail_id?: number;
    killmail_time?: {
        gte?: Date;
        lte?: Date;
    };
    solar_system_id?: number;
    region_id?: number;
    character_id?: number;
    corporation_id?: number;
    alliance_id?: number;
    ship_type_id?: number;
    war_id?: number;
    attacker_character_id?: number;
    attacker_corporation_id?: number;
    attacker_alliance_id?: number;
    victim_character_id?: number;
    victim_corporation_id?: number;
    victim_alliance_id?: number;
    total_value?: {
        gte?: number;
        lte?: number;
    };
}

export interface KillmailSearchOptions {
    filter?: KillmailSearchFilters;
    search?: string;
    page?: number;
    limit?: number;
    sort?: {
        field: string;
        order: "asc" | "desc";
    };
}

// Extended killmail type with relations for ESI reconstruction
type KillmailWithRelations = Killmail & {
    victim?:
        | (KillmailVictim & {
              character?: { name: any } | null;
              corporation?: { name: any } | null;
              alliance?: { name: any } | null;
              faction?: { name: any } | null;
              ship_type?: { name: any } | null;
              ship_group?: { group_name: string } | null;
          })
        | null;
    attackers?: (KillmailAttacker & {
        character?: { name: any } | null;
        corporation?: { name: any } | null;
        alliance?: { name: any } | null;
        faction?: { name: any } | null;
        ship_type?: { name: any } | null;
        ship_group?: { group_name: string } | null;
        weapon_type?: { name: any } | null;
    })[];
    items?: (KillmailItem & {
        item_type?: { name: any } | null;
        group?: { group_name: string } | null;
        child_items?: (KillmailItem & {
            item_type?: { name: any } | null;
            group?: { group_name: string } | null;
        })[];
    })[];
    solar_system?: { system_name: string; security: number | null } | null;
    constellation?: { constellation_name: string } | null;
    region?: { region_name: string } | null;
};

export class KillmailService {
    /**
     * Find a killmail by its ID (basic data only)
     */
    static async findById(killmailId: number): Promise<Killmail | null> {
        return await prisma.killmail.findUnique({
            where: {
                killmail_id: killmailId,
            },
        });
    }

    /**
     * Find killmail by ID with full relations (for ESI format reconstruction)
     */
    static async findByIdWithFull(
        killmailId: number
    ): Promise<KillmailWithRelations | null> {
        return (await prisma.killmail.findUnique({
            where: {
                killmail_id: killmailId,
            },
            include: {
                victim: {
                    include: {
                        character: { select: { name: true } },
                        corporation: { select: { name: true } },
                        alliance: { select: { name: true } },
                        faction: { select: { name: true } },
                        ship_type: { select: { name: true } },
                        ship_group: { select: { group_name: true } },
                    },
                },
                attackers: {
                    include: {
                        character: { select: { name: true } },
                        corporation: { select: { name: true } },
                        alliance: { select: { name: true } },
                        faction: { select: { name: true } },
                        ship_type: { select: { name: true } },
                        ship_group: { select: { group_name: true } },
                        weapon_type: { select: { name: true } },
                    },
                },
                items: {
                    where: { parent_item_id: null }, // Only top-level items
                    include: {
                        item_type: { select: { name: true } },
                        group: { select: { group_name: true } },
                        child_items: {
                            include: {
                                item_type: { select: { name: true } },
                                group: { select: { group_name: true } },
                            },
                        },
                    },
                },
                solar_system: { select: { system_name: true, security: true } },
                constellation: { select: { constellation_name: true } },
                region: { select: { region_name: true } },
            },
        })) as KillmailWithRelations | null;
    }

    /**
     * Convert normalized killmail data back to ESI format
     */
    static toESIFormat(killmail: KillmailWithRelations): IESIKillmail {
        if (!killmail.victim) {
            throw new Error("Killmail victim data is required for ESI format");
        }

        // Build victim with all required fields
        const esiVictim: IESIVictim = {
            character_id: killmail.victim.character_id || 0,
            corporation_id: killmail.victim.corporation_id || 0,
            alliance_id: killmail.victim.alliance_id || 0,
            faction_id: killmail.victim.faction_id || 0,
            damage_taken: killmail.victim.damage_taken,
            ship_type_id: killmail.victim.ship_type_id,
            items: [], // Items will be populated from the items relation if needed
            position: {
                x: killmail.victim.x || 0,
                y: killmail.victim.y || 0,
                z: killmail.victim.z || 0,
            },
        };

        // Build attackers with all required fields
        const esiAttackers: IESIAttacker[] = (killmail.attackers || []).map(
            (attacker) => ({
                character_id: attacker.character_id || 0,
                corporation_id: attacker.corporation_id || 0,
                alliance_id: attacker.alliance_id || 0,
                faction_id: attacker.faction_id || 0,
                damage_done: attacker.damage_done,
                final_blow: attacker.final_blow,
                security_status: attacker.security_status || 0,
                ship_type_id: attacker.ship_type_id || 0,
                weapon_type_id: attacker.weapon_type_id || 0,
            })
        );

        const esiFormat: IESIKillmail = {
            killmail_id: killmail.killmail_id,
            killmail_hash: killmail.killmail_hash,
            killmail_time: killmail.killmail_time,
            solar_system_id: killmail.solar_system_id,
            victim: esiVictim,
            attackers: esiAttackers,
        };

        return esiFormat;
    }

    /**
     * Create killmail from ESI data (for queue processing)
     */
    static async createFromESI(esiData: IESIKillmail): Promise<Killmail> {
        return await prisma.$transaction(async (tx) => {
            // Create main killmail record
            const killmail = await tx.killmail.create({
                data: {
                    killmail_id: esiData.killmail_id,
                    killmail_hash: esiData.killmail_hash,
                    killmail_time: new Date(esiData.killmail_time),
                    solar_system_id: esiData.solar_system_id,
                    processed: false, // Will be enriched later
                },
            });

            // Create victim record
            if (esiData.victim) {
                await tx.killmailVictim.create({
                    data: {
                        killmail_id: killmail.killmail_id,
                        character_id: esiData.victim.character_id || null,
                        corporation_id: esiData.victim.corporation_id || null,
                        alliance_id: esiData.victim.alliance_id || null,
                        faction_id: esiData.victim.faction_id || null,
                        ship_type_id: esiData.victim.ship_type_id,
                        damage_taken: esiData.victim.damage_taken,
                        x: esiData.victim.position?.x || null,
                        y: esiData.victim.position?.y || null,
                        z: esiData.victim.position?.z || null,
                    },
                });
            }

            // Create attacker records
            if (esiData.attackers && esiData.attackers.length > 0) {
                await tx.killmailAttacker.createMany({
                    data: esiData.attackers.map((attacker) => ({
                        killmail_id: killmail.killmail_id,
                        character_id: attacker.character_id || null,
                        corporation_id: attacker.corporation_id || null,
                        alliance_id: attacker.alliance_id || null,
                        faction_id: attacker.faction_id || null,
                        ship_type_id: attacker.ship_type_id || null,
                        weapon_type_id: attacker.weapon_type_id || null,
                        damage_done: attacker.damage_done,
                        final_blow: attacker.final_blow,
                        security_status: attacker.security_status || null,
                    })),
                });
            }

            return killmail;
        });
    }

    /**
     * Enrich killmail with calculated values and metadata (for queue processing)
     */
    static async enrichKillmail(
        killmailId: number,
        enrichmentData: {
            total_value?: number;
            fitting_value?: number;
            ship_value?: number;
            constellation_id?: number;
            region_id?: number;
            is_npc?: boolean;
            is_solo?: boolean;
            dna?: string;
            near?: string;
        }
    ): Promise<Killmail> {
        return await prisma.killmail.update({
            where: { killmail_id: killmailId },
            data: {
                ...enrichmentData,
                processed: true,
                updated_at: new Date(),
            },
        });
    }

    /**
     * Find unprocessed killmails for queue processing
     */
    static async findUnprocessed(limit: number = 100): Promise<Killmail[]> {
        return await prisma.killmail.findMany({
            where: {
                processed: false,
                OR: [
                    { delayed_until: null },
                    { delayed_until: { lte: new Date() } },
                ],
            },
            orderBy: {
                created_at: "asc",
            },
            take: limit,
        });
    }

    /**
     * Mark killmail as processed
     */
    static async markAsProcessed(killmailId: number): Promise<Killmail> {
        return await prisma.killmail.update({
            where: { killmail_id: killmailId },
            data: { processed: true, updated_at: new Date() },
        });
    }

    /**
     * Mark killmail as delayed (for retry processing)
     */
    static async markAsDelayed(
        killmailId: number,
        delayUntil: Date,
        error?: string
    ): Promise<Killmail> {
        return await prisma.killmail.update({
            where: { killmail_id: killmailId },
            data: {
                delayed_until: delayUntil,
                processing_error: error || null,
                updated_at: new Date(),
            },
        });
    }

    /**
     * Find killmails by killmail IDs
     */
    static async findByIds(killmailIds: number[]): Promise<Killmail[]> {
        return await prisma.killmail.findMany({
            where: {
                killmail_id: {
                    in: killmailIds,
                },
            },
        });
    }

    /**
     * Search killmails with filters and pagination
     */
    static async searchWithPagination(options: KillmailSearchOptions) {
        const {
            filter = {},
            page = 1,
            limit = 50,
            sort = { field: "killmail_time", order: "desc" },
        } = options;

        const skip = (page - 1) * limit;
        const where = this.buildWhereClause(filter);
        const orderBy = this.buildOrderBy(sort);

        const [results, total] = await Promise.all([
            prisma.killmail.findMany({
                where,
                orderBy,
                take: limit,
                skip,
            }),
            prisma.killmail.count({ where }),
        ]);

        return {
            data: results,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
        };
    }

    /**
     * Find killmails by character involvement (victim or attacker)
     */
    static async findByCharacter(
        characterId: number,
        limit: number = 50,
        offset: number = 0,
        options: { victimOnly?: boolean; attackerOnly?: boolean } = {}
    ): Promise<Killmail[]> {
        const { victimOnly, attackerOnly } = options;

        let where: Prisma.KillmailWhereInput;

        if (victimOnly) {
            where = { victim: { character_id: characterId } };
        } else if (attackerOnly) {
            where = { attackers: { some: { character_id: characterId } } };
        } else {
            where = {
                OR: [
                    { victim: { character_id: characterId } },
                    { attackers: { some: { character_id: characterId } } },
                ],
            };
        }

        return await prisma.killmail.findMany({
            where,
            orderBy: {
                killmail_time: "desc",
            },
            take: limit,
            skip: offset,
        });
    }

    /**
     * Count killmails by character involvement
     */
    static async countByCharacter(
        characterId: number,
        options: { victimOnly?: boolean; attackerOnly?: boolean } = {}
    ): Promise<number> {
        const { victimOnly, attackerOnly } = options;

        let where: Prisma.KillmailWhereInput;

        if (victimOnly) {
            where = { victim: { character_id: characterId } };
        } else if (attackerOnly) {
            where = { attackers: { some: { character_id: characterId } } };
        } else {
            where = {
                OR: [
                    { victim: { character_id: characterId } },
                    { attackers: { some: { character_id: characterId } } },
                ],
            };
        }

        return await prisma.killmail.count({ where });
    }

    /**
     * Find killmails by alliance involvement (victim or attacker)
     */
    static async findByAlliance(
        allianceId: number,
        limit: number = 50,
        offset: number = 0,
        options: { victimOnly?: boolean; attackerOnly?: boolean } = {}
    ): Promise<Killmail[]> {
        const { victimOnly, attackerOnly } = options;

        let where: Prisma.KillmailWhereInput;

        if (victimOnly) {
            where = { victim: { alliance_id: allianceId } };
        } else if (attackerOnly) {
            where = { attackers: { some: { alliance_id: allianceId } } };
        } else {
            where = {
                OR: [
                    { victim: { alliance_id: allianceId } },
                    { attackers: { some: { alliance_id: allianceId } } },
                ],
            };
        }

        return await prisma.killmail.findMany({
            where,
            orderBy: {
                killmail_time: "desc",
            },
            take: limit,
            skip: offset,
        });
    }

    /**
     * Count killmails by alliance involvement
     */
    static async countByAlliance(
        allianceId: number,
        options: { victimOnly?: boolean; attackerOnly?: boolean } = {}
    ): Promise<number> {
        const { victimOnly, attackerOnly } = options;

        let where: Prisma.KillmailWhereInput;

        if (victimOnly) {
            where = { victim: { alliance_id: allianceId } };
        } else if (attackerOnly) {
            where = { attackers: { some: { alliance_id: allianceId } } };
        } else {
            where = {
                OR: [
                    { victim: { alliance_id: allianceId } },
                    { attackers: { some: { alliance_id: allianceId } } },
                ],
            };
        }

        return await prisma.killmail.count({ where });
    }

    /**
     * Find killmails by corporation involvement (victim or attacker)
     */
    static async findByCorporation(
        corporationId: number,
        limit: number = 50,
        offset: number = 0,
        options: { victimOnly?: boolean; attackerOnly?: boolean } = {}
    ): Promise<Killmail[]> {
        const { victimOnly, attackerOnly } = options;

        let where: Prisma.KillmailWhereInput;

        if (victimOnly) {
            where = { victim: { corporation_id: corporationId } };
        } else if (attackerOnly) {
            where = { attackers: { some: { corporation_id: corporationId } } };
        } else {
            where = {
                OR: [
                    { victim: { corporation_id: corporationId } },
                    { attackers: { some: { corporation_id: corporationId } } },
                ],
            };
        }

        return await prisma.killmail.findMany({
            where,
            orderBy: {
                killmail_time: "desc",
            },
            take: limit,
            skip: offset,
        });
    }

    /**
     * Count killmails by corporation involvement
     */
    static async countByCorporation(
        corporationId: number,
        options: { victimOnly?: boolean; attackerOnly?: boolean } = {}
    ): Promise<number> {
        const { victimOnly, attackerOnly } = options;

        let where: Prisma.KillmailWhereInput;

        if (victimOnly) {
            where = { victim: { corporation_id: corporationId } };
        } else if (attackerOnly) {
            where = { attackers: { some: { corporation_id: corporationId } } };
        } else {
            where = {
                OR: [
                    { victim: { corporation_id: corporationId } },
                    { attackers: { some: { corporation_id: corporationId } } },
                ],
            };
        }

        return await prisma.killmail.count({ where });
    }

    /**
     * Find killmails by solar system
     */
    static async findBySystem(
        systemId: number,
        limit: number = 50,
        offset: number = 0
    ): Promise<Killmail[]> {
        return await prisma.killmail.findMany({
            where: {
                solar_system_id: systemId,
            },
            orderBy: {
                killmail_time: "desc",
            },
            take: limit,
            skip: offset,
        });
    }

    /**
     * Count killmails by solar system
     */
    static async countBySystem(systemId: number): Promise<number> {
        return await prisma.killmail.count({
            where: {
                solar_system_id: systemId,
            },
        });
    }

    /**
     * Find killmails by region
     */
    static async findByRegion(
        regionId: number,
        limit: number = 50,
        offset: number = 0
    ): Promise<Killmail[]> {
        return await prisma.killmail.findMany({
            where: {
                region_id: regionId,
            },
            orderBy: {
                killmail_time: "desc",
            },
            take: limit,
            skip: offset,
        });
    }

    /**
     * Count killmails by region
     */
    static async countByRegion(regionId: number): Promise<number> {
        return await prisma.killmail.count({
            where: {
                region_id: regionId,
            },
        });
    }

    /**
     * Find killmails by war
     */
    static async findByWar(
        warId: number,
        limit: number = 50,
        offset: number = 0
    ): Promise<Killmail[]> {
        return await prisma.killmail.findMany({
            where: {
                war_id: warId,
            },
            orderBy: {
                killmail_time: "desc",
            },
            take: limit,
            skip: offset,
        });
    }

    /**
     * Count killmails by war
     */
    static async countByWar(warId: number): Promise<number> {
        return await prisma.killmail.count({
            where: {
                war_id: warId,
            },
        });
    }

    /**
     * Find killmails by ship type (victim ship)
     */
    static async findByShipType(
        shipTypeId: number,
        limit: number = 50,
        offset: number = 0
    ): Promise<Killmail[]> {
        return await prisma.killmail.findMany({
            where: {
                victim: {
                    ship_type_id: shipTypeId,
                },
            },
            orderBy: {
                killmail_time: "desc",
            },
            take: limit,
            skip: offset,
        });
    }

    /**
     * Count killmails by ship type (victim ship)
     */
    static async countByShipType(shipTypeId: number): Promise<number> {
        return await prisma.killmail.count({
            where: {
                victim: {
                    ship_type_id: shipTypeId,
                },
            },
        });
    }

    /**
     * Get aggregate statistics
     */
    static async getAggregateStats(filter?: KillmailSearchFilters) {
        const where = this.buildWhereClause(filter || {});

        const [total, totalValue, avgValue] = await Promise.all([
            prisma.killmail.count({ where }),
            prisma.killmail.aggregate({
                where,
                _sum: {
                    total_value: true,
                },
            }),
            prisma.killmail.aggregate({
                where,
                _avg: {
                    total_value: true,
                },
            }),
        ]);

        return {
            total_killmails: total,
            total_isk_destroyed: totalValue._sum.total_value || 0,
            average_killmail_value: avgValue._avg.total_value || 0,
        };
    }

    /**
     * Create a new killmail
     */
    static async create(data: Prisma.KillmailCreateInput): Promise<Killmail> {
        return await prisma.killmail.create({
            data,
        });
    }

    /**
     * Update a killmail
     */
    static async update(
        killmailId: number,
        data: Prisma.KillmailUpdateInput
    ): Promise<Killmail> {
        return await prisma.killmail.update({
            where: {
                killmail_id: killmailId,
            },
            data,
        });
    }

    /**
     * Delete a killmail
     */
    static async delete(killmailId: number): Promise<Killmail> {
        return await prisma.killmail.delete({
            where: {
                killmail_id: killmailId,
            },
        });
    }

    /**
     * Build WHERE clause from search filters (using normalized relations)
     */
    private static buildWhereClause(
        filter: KillmailSearchFilters
    ): Prisma.KillmailWhereInput {
        const where: Prisma.KillmailWhereInput = {};

        if (filter.killmail_id) {
            where.killmail_id = filter.killmail_id;
        }

        if (filter.killmail_time) {
            where.killmail_time = filter.killmail_time;
        }

        if (filter.solar_system_id) {
            where.solar_system_id = filter.solar_system_id;
        }

        if (filter.region_id) {
            where.region_id = filter.region_id;
        }

        if (filter.character_id) {
            where.OR = [
                { victim: { character_id: filter.character_id } },
                { attackers: { some: { character_id: filter.character_id } } },
            ];
        }

        if (filter.corporation_id) {
            where.OR = [
                { victim: { corporation_id: filter.corporation_id } },
                {
                    attackers: {
                        some: { corporation_id: filter.corporation_id },
                    },
                },
            ];
        }

        if (filter.alliance_id) {
            where.OR = [
                { victim: { alliance_id: filter.alliance_id } },
                { attackers: { some: { alliance_id: filter.alliance_id } } },
            ];
        }

        if (filter.ship_type_id) {
            where.victim = { ship_type_id: filter.ship_type_id };
        }

        if (filter.war_id) {
            where.war_id = filter.war_id;
        }

        if (filter.attacker_character_id) {
            where.attackers = {
                some: { character_id: filter.attacker_character_id },
            };
        }

        if (filter.attacker_corporation_id) {
            where.attackers = {
                some: { corporation_id: filter.attacker_corporation_id },
            };
        }

        if (filter.attacker_alliance_id) {
            where.attackers = {
                some: { alliance_id: filter.attacker_alliance_id },
            };
        }

        if (filter.victim_character_id) {
            where.victim = { character_id: filter.victim_character_id };
        }

        if (filter.victim_corporation_id) {
            where.victim = { corporation_id: filter.victim_corporation_id };
        }

        if (filter.victim_alliance_id) {
            where.victim = { alliance_id: filter.victim_alliance_id };
        }

        if (filter.total_value) {
            where.total_value = filter.total_value;
        }

        return where;
    }

    /**
     * Build ORDER BY clause from sort options
     */
    private static buildOrderBy(sort: {
        field: string;
        order: "asc" | "desc";
    }): Prisma.KillmailOrderByWithRelationInput {
        return {
            [sort.field]: sort.order,
        };
    }

    /**
     * Get war statistics using normalized schema
     */
    static async getWarStats(warId: number) {
        const [
            totalKills,
            totalValue,
            topKillers,
            mostValuableKills,
            shipTypeStats,
        ] = await Promise.all([
            // Total kills count
            prisma.killmail.count({ where: { war_id: warId } }),

            // Total ISK destroyed
            prisma.killmail.aggregate({
                where: { war_id: warId },
                _sum: { total_value: true },
            }),

            // Top killers (based on final_blow)
            prisma.killmailAttacker.groupBy({
                by: ["character_id"],
                where: {
                    killmail: { war_id: warId },
                    final_blow: true,
                },
                _count: true,
                orderBy: { _count: { character_id: "desc" } },
                take: 20,
            }),

            // Most valuable kills
            prisma.killmail.findMany({
                where: { war_id: warId },
                select: {
                    killmail_id: true,
                    total_value: true,
                    victim: {
                        select: {
                            character_id: true,
                            ship_type_id: true,
                            character: { select: { name: true } },
                            ship_type: { select: { name: true } },
                        },
                    },
                },
                orderBy: { total_value: "desc" },
                take: 10,
            }),

            // Ship type breakdown
            prisma.killmailVictim.groupBy({
                by: ["ship_group_id"],
                where: {
                    killmail: { war_id: warId },
                    ship_group_id: { not: null },
                },
                _count: true,
                orderBy: { _count: { ship_group_id: "desc" } },
                take: 15,
            }),
        ]);

        // Get unique entity counts
        const [uniqueCharacters, uniqueCorporations, uniqueAlliances] =
            await Promise.all([
                prisma.killmailVictim.findMany({
                    where: {
                        killmail: { war_id: warId },
                        character_id: { not: null },
                    },
                    distinct: ["character_id"],
                    select: { character_id: true },
                }),
                prisma.killmailVictim.findMany({
                    where: {
                        killmail: { war_id: warId },
                        corporation_id: { not: null },
                    },
                    distinct: ["corporation_id"],
                    select: { corporation_id: true },
                }),
                prisma.killmailVictim.findMany({
                    where: {
                        killmail: { war_id: warId },
                        alliance_id: { not: null },
                    },
                    distinct: ["alliance_id"],
                    select: { alliance_id: true },
                }),
            ]);

        return {
            totalKills,
            totalValue: totalValue._sum.total_value || 0,
            uniqueCharacters: uniqueCharacters.length,
            uniqueCorporations: uniqueCorporations.length,
            uniqueAlliances: uniqueAlliances.length,
            topKillers: topKillers.map((tk) => ({
                character_id: tk.character_id,
                kills: tk._count,
            })),
            mostValuableKills: mostValuableKills.map((mvk) => ({
                killmail_id: mvk.killmail_id,
                total_value: mvk.total_value,
                ship_id: mvk.victim?.ship_type_id,
                ship_name: mvk.victim?.ship_type?.name,
                character_id: mvk.victim?.character_id,
                character_name: mvk.victim?.character?.name,
            })),
            shipTypeStats: shipTypeStats.map((sts) => ({
                ship_group_id: sts.ship_group_id,
                count: sts._count,
            })),
        };
    }

    /**
     * Count killmails by ship type (where the type_id was the victim's ship)
     */
    static async countByVictimShipType(
        shipTypeId: number,
        dateFilter?: Date
    ): Promise<number> {
        const where: any = {
            victim: {
                ship_type_id: shipTypeId,
            },
        };

        if (dateFilter) {
            where.killmail_time = {
                gte: dateFilter,
            };
        }

        return await prisma.killmail.count({ where });
    }

    /**
     * Count killmails by item type (where the type_id appeared in dropped/destroyed items)
     */
    static async countByItemType(
        itemTypeId: number,
        dateFilter?: Date
    ): Promise<number> {
        const where: any = {
            items: {
                some: {
                    item_type_id: itemTypeId,
                },
            },
        };

        if (dateFilter) {
            where.killmail_time = {
                gte: dateFilter,
            };
        }

        return await prisma.killmail.count({ where });
    }

    /**
     * Count killmails by type_id - works for both ships and items
     * For ships: counts where type_id was the victim's ship
     * For items: counts where type_id appeared in the items list
     */
    static async countByTypeId(
        typeId: number,
        isShip: boolean,
        dateFilter?: Date
    ): Promise<number> {
        if (isShip) {
            return await this.countByVictimShipType(typeId, dateFilter);
        } else {
            return await this.countByItemType(typeId, dateFilter);
        }
    }

    /**
     * Get the total count of all killmails
     */
    static async getTotalCount(): Promise<number> {
        return await prisma.killmail.count();
    }
}
