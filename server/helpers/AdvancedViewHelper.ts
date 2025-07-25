import { createError } from "h3";
import { type ITranslation } from "../interfaces/ITranslation";
import { type IKillmail } from "../interfaces/IKillmail";
import { type IInvGroup } from "../interfaces/IInvGroup";
import { Killmails, type IKillmailDocument } from "../models/Killmails";
import { InvGroups, type IInvGroupDocument } from "../models/InvGroups";

/**
 * Interface representing the output of advanced view statistics.
 * Based on ICampaignOutput but adapted for query-based filters.
 */
export interface IAdvancedViewOutput {
    // Query metadata
    query: Record<string, any>;
    totalKillmails: number;
    isApproximate?: boolean; // Indicates if sampling was used

    // Advanced view statistics
    totalKills: number;
    iskDestroyed: number;
    shipGroupStats: Array<{
        ship_group_id: number;
        ship_group_name: string | ITranslation;
        killed: number;
    }>;

    // Character statistics
    topKillersByCharacter: Array<{
        character_id: number;
        character_name: string;
        kills: number;
    }>;
    topVictimsByCharacter: Array<{
        character_id: number;
        character_name: string;
        losses: number;
    }>;
    topDamageDealersByCharacter: Array<{
        character_id: number;
        character_name: string;
        damageDone: number;
    }>;

    // Corporation statistics
    topKillersByCorporation: Array<{
        corporation_id: number;
        corporation_name: string;
        kills: number;
    }>;

    // Alliance statistics
    topKillersByAlliance: Array<{
        alliance_id: number;
        alliance_name: string;
        kills: number;
    }>;

    // Most valuable kills
    mostValuableKills: Array<{
        killmail_id: number;
        total_value: number;
        victim: {
            ship_id: number;
            ship_name: string | ITranslation;
            character_id?: number;
            character_name?: string;
            corporation_id?: number;
            corporation_name?: string;
            alliance_id?: number;
            alliance_name?: string;
        };
        final_blow?: {
            character_id?: number;
            character_name?: string;
            ship_id: number;
            ship_name: string | ITranslation;
        };
    }>;
}

/**
 * Get valid ship group IDs from InvGroups where category_id = 6 (Ships) and published = true
 */
async function getValidShipGroupIds(): Promise<Set<number>> {
    const shipGroups = await InvGroups.find(
        { category_id: 6, published: true },
        { group_id: 1 }
    ).lean();

    return new Set(shipGroups.map((group: any) => group.group_id));
}

/**
 * Convert string dates in a query to proper Date objects for MongoDB
 */
function normalizeQueryDates(query: Record<string, any>): Record<string, any> {
    const normalizedQuery = JSON.parse(JSON.stringify(query)); // Deep clone

    function convertDates(obj: any): any {
        if (obj && typeof obj === "object") {
            if (Array.isArray(obj)) {
                return obj.map(convertDates);
            }

            const result: any = {};
            for (const [key, value] of Object.entries(obj)) {
                if (key === "kill_time" && value && typeof value === "object") {
                    result[key] = {};
                    for (const [op, dateValue] of Object.entries(
                        value as any
                    )) {
                        if (typeof dateValue === "string") {
                            result[key][op] = new Date(dateValue);
                        } else {
                            result[key][op] = dateValue;
                        }
                    }
                } else if (typeof value === "object") {
                    result[key] = convertDates(value);
                } else {
                    result[key] = value;
                }
            }
            return result;
        }
        return obj;
    }

    return convertDates(normalizedQuery);
}

/**
 * Generate advanced view statistics based on a MongoDB query.
 * Uses cursor-based iteration for database efficiency.
 *
 * @param query - The MongoDB query object to filter killmails
 * @returns An object containing the advanced view statistics
 */
async function generateAdvancedViewStats(
    query: Record<string, any>
): Promise<IAdvancedViewOutput> {
    // Normalize query dates to proper Date objects
    const normalizedQuery = normalizeQueryDates(query);

    console.log(
        `Advanced view stats - Generating statistics with cursor iteration`
    );

    // Initialize statistics
    const stats: IAdvancedViewOutput = {
        query,
        totalKillmails: 0,
        totalKills: 0,
        iskDestroyed: 0,
        shipGroupStats: [],
        topKillersByCharacter: [],
        topVictimsByCharacter: [],
        topDamageDealersByCharacter: [],
        topKillersByCorporation: [],
        topKillersByAlliance: [],
        mostValuableKills: [],
        isApproximate: false,
    };

    // Get valid ship group IDs (category_id = 6, published = true)
    const validShipGroupIds = await getValidShipGroupIds();

    // Maps to collect aggregated data
    const shipGroupMap = new Map<
        number,
        { ship_group_name: string | any; killed: number }
    >();
    const killerCharacterMap = new Map<
        number,
        { character_name: string; kills: number }
    >();
    const victimCharacterMap = new Map<
        number,
        { character_name: string; losses: number }
    >();
    const damageCharacterMap = new Map<
        number,
        { character_name: string; totalDamageValue: number; killCount: number }
    >();
    const killerCorporationMap = new Map<
        number,
        { corporation_name: string; kills: number }
    >();
    const killerAllianceMap = new Map<
        number,
        { alliance_name: string; kills: number }
    >();
    const mostValuableList: Array<{
        killmail_id: number;
        total_value: number;
        victim: any;
        final_blow?: any;
    }> = [];

    // Use cursor to iterate through killmails
    const cursor = Killmails.find(normalizedQuery)
        .select({
            killmail_id: 1,
            total_value: 1,
            victim: 1,
            attackers: 1,
        })
        .lean()
        .cursor();

    let processedCount = 0;
    let totalIskDestroyed = 0;

    await cursor.eachAsync((killmail: any) => {
        processedCount++;
        totalIskDestroyed += killmail.total_value || 0;

        // Track victim for character losses
        if (killmail.victim?.character_id && killmail.victim?.character_name) {
            const victimId = killmail.victim.character_id;
            if (victimCharacterMap.has(victimId)) {
                victimCharacterMap.get(victimId)!.losses++;
            } else {
                victimCharacterMap.set(victimId, {
                    character_name: killmail.victim.character_name,
                    losses: 1,
                });
            }
        }

        // Track most valuable kills (keep top 10)
        if (mostValuableList.length < 10) {
            const finalBlow = killmail.attackers?.find(
                (attacker: any) => attacker.final_blow
            );
            mostValuableList.push({
                killmail_id: killmail.killmail_id,
                total_value: killmail.total_value,
                victim: {
                    ship_id: killmail.victim?.ship_id || 0,
                    ship_name: killmail.victim?.ship_name || "Unknown",
                    character_id: killmail.victim?.character_id,
                    character_name: killmail.victim?.character_name,
                    corporation_id: killmail.victim?.corporation_id,
                    corporation_name: killmail.victim?.corporation_name,
                    alliance_id: killmail.victim?.alliance_id,
                    alliance_name: killmail.victim?.alliance_name,
                },
                final_blow: finalBlow
                    ? {
                          character_id: finalBlow.character_id,
                          character_name: finalBlow.character_name,
                          ship_id: finalBlow.ship_id || 0,
                          ship_name: finalBlow.ship_name || "Unknown",
                      }
                    : undefined,
            });
            // Sort to keep highest value at top
            mostValuableList.sort(
                (a, b) => (b.total_value || 0) - (a.total_value || 0)
            );
        } else if (
            (killmail.total_value || 0) > (mostValuableList[9].total_value || 0)
        ) {
            // Replace lowest value kill
            const finalBlow = killmail.attackers?.find(
                (attacker: any) => attacker.final_blow
            );
            mostValuableList[9] = {
                killmail_id: killmail.killmail_id,
                total_value: killmail.total_value,
                victim: {
                    ship_id: killmail.victim?.ship_id || 0,
                    ship_name: killmail.victim?.ship_name || "Unknown",
                    character_id: killmail.victim?.character_id,
                    character_name: killmail.victim?.character_name,
                    corporation_id: killmail.victim?.corporation_id,
                    corporation_name: killmail.victim?.corporation_name,
                    alliance_id: killmail.victim?.alliance_id,
                    alliance_name: killmail.victim?.alliance_name,
                },
                final_blow: finalBlow
                    ? {
                          character_id: finalBlow.character_id,
                          character_name: finalBlow.character_name,
                          ship_id: finalBlow.ship_id || 0,
                          ship_name: finalBlow.ship_name || "Unknown",
                      }
                    : undefined,
            };
            mostValuableList.sort(
                (a, b) => (b.total_value || 0) - (a.total_value || 0)
            );
        }

        // Track victim ship group stats (ships destroyed)
        if (
            killmail.victim?.ship_group_id &&
            validShipGroupIds.has(killmail.victim.ship_group_id)
        ) {
            if (shipGroupMap.has(killmail.victim.ship_group_id)) {
                shipGroupMap.get(killmail.victim.ship_group_id)!.killed++;
            } else {
                shipGroupMap.set(killmail.victim.ship_group_id, {
                    ship_group_name:
                        killmail.victim.ship_group_name || "Unknown",
                    killed: 1,
                });
            }
        }

        // Process attackers
        if (killmail.attackers && Array.isArray(killmail.attackers)) {
            // Track which corps and alliances we've already counted for this killmail
            const countedCorporations = new Set<number>();
            const countedAlliances = new Set<number>();

            killmail.attackers.forEach((attacker: any) => {
                // Character killer stats
                if (attacker.character_id && attacker.character_name) {
                    if (killerCharacterMap.has(attacker.character_id)) {
                        killerCharacterMap.get(attacker.character_id)!.kills++;
                    } else {
                        killerCharacterMap.set(attacker.character_id, {
                            character_name: attacker.character_name,
                            kills: 1,
                        });
                    }

                    // Character damage stats (using total_value as proxy)
                    if (damageCharacterMap.has(attacker.character_id)) {
                        const entry = damageCharacterMap.get(
                            attacker.character_id
                        )!;
                        entry.totalDamageValue += killmail.total_value || 0;
                        entry.killCount++;
                    } else {
                        damageCharacterMap.set(attacker.character_id, {
                            character_name: attacker.character_name,
                            totalDamageValue: killmail.total_value || 0,
                            killCount: 1,
                        });
                    }
                }

                // Corporation killer stats (only count once per killmail per corporation)
                if (
                    attacker.corporation_id &&
                    attacker.corporation_name &&
                    !countedCorporations.has(attacker.corporation_id)
                ) {
                    countedCorporations.add(attacker.corporation_id);

                    if (killerCorporationMap.has(attacker.corporation_id)) {
                        killerCorporationMap.get(attacker.corporation_id)!
                            .kills++;
                    } else {
                        killerCorporationMap.set(attacker.corporation_id, {
                            corporation_name: attacker.corporation_name,
                            kills: 1,
                        });
                    }
                }

                // Alliance killer stats (only count once per killmail per alliance)
                if (
                    attacker.alliance_id &&
                    attacker.alliance_name &&
                    !countedAlliances.has(attacker.alliance_id)
                ) {
                    countedAlliances.add(attacker.alliance_id);

                    if (killerAllianceMap.has(attacker.alliance_id)) {
                        killerAllianceMap.get(attacker.alliance_id)!.kills++;
                    } else {
                        killerAllianceMap.set(attacker.alliance_id, {
                            alliance_name: attacker.alliance_name,
                            kills: 1,
                        });
                    }
                }
            });
        }
    });

    // Convert maps to sorted arrays and take top 10
    stats.shipGroupStats = Array.from(shipGroupMap.entries())
        .map(([ship_group_id, data]) => ({
            ship_group_id,
            ship_group_name: data.ship_group_name,
            killed: data.killed,
        }))
        .sort((a, b) => b.killed - a.killed);

    stats.topKillersByCharacter = Array.from(killerCharacterMap.entries())
        .map(([character_id, data]) => ({
            character_id,
            character_name: data.character_name,
            kills: data.kills,
        }))
        .sort((a, b) => b.kills - a.kills)
        .slice(0, 10);

    stats.topVictimsByCharacter = Array.from(victimCharacterMap.entries())
        .map(([character_id, data]) => ({
            character_id,
            character_name: data.character_name,
            losses: data.losses,
        }))
        .sort((a, b) => b.losses - a.losses)
        .slice(0, 10);

    stats.topDamageDealersByCharacter = Array.from(damageCharacterMap.entries())
        .map(([character_id, data]) => ({
            character_id,
            character_name: data.character_name,
            damageDone: Math.round(data.totalDamageValue / data.killCount), // Average damage per kill
        }))
        .sort((a, b) => b.damageDone - a.damageDone)
        .slice(0, 10);

    stats.topKillersByCorporation = Array.from(killerCorporationMap.entries())
        .map(([corporation_id, data]) => ({
            corporation_id,
            corporation_name: data.corporation_name,
            kills: data.kills,
        }))
        .sort((a, b) => b.kills - a.kills)
        .slice(0, 10);

    stats.topKillersByAlliance = Array.from(killerAllianceMap.entries())
        .map(([alliance_id, data]) => ({
            alliance_id,
            alliance_name: data.alliance_name,
            kills: data.kills,
        }))
        .sort((a, b) => b.kills - a.kills)
        .slice(0, 10);

    stats.mostValuableKills = mostValuableList;

    // Set basic stats
    stats.totalKillmails = processedCount;
    stats.totalKills = processedCount;
    stats.iskDestroyed = totalIskDestroyed;

    // Debug: Log final array sizes
    console.log(
        `Cursor processed ${processedCount} killmails. Final stats: totalKills=${stats.totalKills}, shipGroups=${stats.shipGroupStats.length}, topKillers=${stats.topKillersByCharacter.length}, topVictims=${stats.topVictimsByCharacter.length}, topDamage=${stats.topDamageDealersByCharacter.length}, topCorps=${stats.topKillersByCorporation.length}, topAlliances=${stats.topKillersByAlliance.length}, mostValuable=${stats.mostValuableKills.length}`
    );

    return stats;
}

// Default export the function
export default generateAdvancedViewStats;

// Also export as named export for compatibility
export { generateAdvancedViewStats };
