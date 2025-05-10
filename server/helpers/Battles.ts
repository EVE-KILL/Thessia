import crypto from "crypto";
import {
    IBattles as IBattlesDocument,
    IEntityStats,
    ITeamSummaryStats
} from "../interfaces/IBattles";
import { IAttacker, IKillmail } from "../interfaces/IKillmail"; // Changed IKillmailVictimAttacker to IAttacker
import type { ITranslation } from "../interfaces/ITranslation";
import { Killmails } from "../models/Killmails";
import { Regions } from "../models/Regions";
import { SolarSystems } from "../models/SolarSystems";

const CAPSULE_IDS = [670, 33328]; // Standard Capsule, Genolution Capsule

/**
 * Aggregates top alliances or corporations involved in a list of killmails.
 */
function getTopEntities(
    battleData: IKillmail[],
    entityType: 'alliance' | 'corporation',
): Array<{ id: number; name: string; count: number }> {
    const entityCharacterSets: Map<number, { name: string; characters: Set<number> }> = new Map();
    const idField = entityType === 'alliance' ? 'alliance_id' : 'corporation_id';
    const nameField = entityType === 'alliance' ? 'alliance_name' : 'corporation_name';

    for (const killmail of battleData) {
        // Process victim
        const victimEntityId = killmail.victim?.[idField as keyof typeof killmail.victim] as number | undefined;
        const victimCharacterId = killmail.victim?.character_id;

        if (victimEntityId && victimCharacterId) {
            const victimEntityName = (killmail.victim as any)?.[nameField] || `Unknown ${entityType} ${victimEntityId}`;
            if (!entityCharacterSets.has(victimEntityId)) {
                entityCharacterSets.set(victimEntityId, { name: victimEntityName, characters: new Set() });
            }
            entityCharacterSets.get(victimEntityId)!.characters.add(victimCharacterId);
        }

        // Process attackers
        for (const attacker of killmail.attackers || []) {
            const attackerEntityId = attacker?.[idField as keyof typeof attacker] as number | undefined;
            const attackerCharacterId = attacker?.character_id;

            if (attackerEntityId && attackerCharacterId) {
                const attackerEntityName = (attacker as any)?.[nameField] || `Unknown ${entityType} ${attackerEntityId}`;
                if (!entityCharacterSets.has(attackerEntityId)) {
                    entityCharacterSets.set(attackerEntityId, { name: attackerEntityName, characters: new Set() });
                }
                entityCharacterSets.get(attackerEntityId)!.characters.add(attackerCharacterId);
            }
        }
    }

    return Array.from(entityCharacterSets.entries())
        .map(([id, data]) => ({
            id,
            name: data.name,
            count: data.characters.size,
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);
}

/**
 * Aggregates top ship types involved in a list of killmails, excluding capsules.
 */
function getTopShipTypes(
    battleData: IKillmail[]
): Array<{ id: number; name: ITranslation; count: number }> { // Changed name type to ITranslation
    const counts: { [key: number]: { id: number; name: ITranslation; count: number } } = {}; // Changed name type here too

    for (const killmail of battleData) {
        // Victim's ship
        const victimShipId = killmail.victim?.ship_id; // Corrected to ship_id
        if (victimShipId) {
            const victimShipName = killmail.victim?.ship_name || { en: `Unknown Ship ${victimShipId}` };
            if (!counts[victimShipId]) {
                counts[victimShipId] = { id: victimShipId, name: victimShipName, count: 0 };
            }
            counts[victimShipId].count++;
        }

        // Attackers' ships
        for (const attacker of killmail.attackers || []) {
            const attackerShipId = attacker?.ship_id; // Corrected to ship_id
            if (attackerShipId) {
                const attackerShipName = attacker?.ship_name || { en: `Unknown Ship ${attackerShipId}` };
                if (!counts[attackerShipId]) {
                    counts[attackerShipId] = { id: attackerShipId, name: attackerShipName, count: 0 };
                }
                counts[attackerShipId].count++;
            }
        }
    }

    return Object.values(counts)
        .filter(ship => !CAPSULE_IDS.includes(ship.id)) // Exclude capsules
        .sort((a, b) => b.count - a.count)
        .slice(0, 10)
        .map(item => ({ id: item.id, name: item.name, count: item.count }));
}

// Helper to initialize stats for an entity (backend version)
function initializeEntityStatsMap(map: Map<number, IEntityStats>, id: number, name: string, allianceId?: number, allianceName?: string): IEntityStats {
    if (!map.has(id)) {
        map.set(id, {
            id,
            name: name || `Unknown Entity ${id}`,
            alliance_id: allianceId,
            alliance_name: allianceName,
            kills: 0,
            losses: 0,
            valueInflicted: 0,
            valueSuffered: 0,
        });
    }
    return map.get(id)!;
}

// Track stats when an entity is the victim
function trackVictimStatsOnMap(map: Map<number, IEntityStats>, id: number | undefined, name: string | undefined, valueSuffered: number, allianceId?: number, allianceName?: string) {
    if (!id || !name) return; // Ensure id and name are present
    const stats = initializeEntityStatsMap(map, id, name, allianceId, allianceName);
    stats.losses += 1;
    stats.valueSuffered += valueSuffered;
}

// Track stats when an entity gets the final blow / top damage
function trackAttackerStatsOnMap(map: Map<number, IEntityStats>, id: number | undefined, name: string | undefined, valueInflicted: number, allianceId?: number, allianceName?: string) {
    if (!id || !name) return; // Ensure id and name are present
    const stats = initializeEntityStatsMap(map, id, name, allianceId, allianceName);
    stats.kills += 1;
    stats.valueInflicted += valueInflicted;
}

// Simplified attacker attribution: prioritizes final blow from the given team.
// If no final blow from team, falls back to top damage from team.
function getAttributingAttackerFromTeam(
    attackers: IAttacker[], // Changed parameter type to IAttacker[]
    teamAllianceIds: Set<number>,
    teamCorpIds: Set<number>
): IAttacker | null { // Changed return type to IAttacker
    if (!attackers || attackers.length === 0) {
        return null;
    }

    // Prioritize final blow from the team
    const finalBlowAttacker = attackers.find(a => a.final_blow);
    if (finalBlowAttacker) {
        if (
            (finalBlowAttacker.alliance_id && teamAllianceIds.has(finalBlowAttacker.alliance_id)) ||
            (finalBlowAttacker.corporation_id && teamCorpIds.has(finalBlowAttacker.corporation_id)) ||
            // Case: Attacker has no alliance/corp but is part of the team (e.g. if teams can include individual characters)
            // This part depends on how `processBattle` defines teams. If teams are strictly alliance/corp based, this is not needed.
            // For now, assuming teams are alliance/corp based as per current `processBattle` output.
            (!finalBlowAttacker.alliance_id && !finalBlowAttacker.corporation_id && finalBlowAttacker.character_id /* && characterIsInTeam(finalBlowAttacker.character_id, team) */)
        ) {
            return finalBlowAttacker;
        }
    }

    // Fallback to top damage dealer from the team
    const sortedAttackers = [...attackers].sort((a, b) => (b.damage_done || 0) - (a.damage_done || 0));
    for (const attacker of sortedAttackers) {
        if ((attacker.damage_done || 0) <= 0) break;
        if (
            (attacker.alliance_id && teamAllianceIds.has(attacker.alliance_id)) ||
            (attacker.corporation_id && teamCorpIds.has(attacker.corporation_id)) ||
            (!attacker.alliance_id && !attacker.corporation_id && attacker.character_id /* && characterIsInTeam(attacker.character_id, team) */)
        ) {
            return attacker;
        }
    }
    return null;
}

export async function compileFullBattleData(
    allKillmailsInvolved: IKillmail[],
    systemId: number,
    battleStartTime: Date,
    battleEndTime: Date,
    existingBattleId?: number | string
): Promise<IBattlesDocument> {
    let battle_id: number;

    const teamsData = processBattle(allKillmailsInvolved, systemId, battleStartTime, battleEndTime);

    if (existingBattleId) {
        battle_id = Number(existingBattleId);
    } else {
        const dataToHash = {
            systemId,
            startTime: battleStartTime.toISOString(),
            endTime: battleEndTime.toISOString(),
            blueTeam: teamsData.blue_team,
            redTeam: teamsData.red_team,
        };
        const hash = crypto.createHash('sha256').update(JSON.stringify(dataToHash)).digest('hex');
        battle_id = parseInt(hash.substring(0, 10), 16);
    }

    const systemInfo = await SolarSystems.findOne({ system_id: systemId }, { system_name: 1, region_id: 1, security: 1 }).lean();
    const regionInfo = systemInfo?.region_id ? await Regions.findOne({ region_id: systemInfo.region_id }, { name: 1 }).lean() : null;

    const duration_ms = battleEndTime.getTime() - battleStartTime.getTime();
    const killmailsCount = allKillmailsInvolved.length;
    const iskDestroyed = allKillmailsInvolved.reduce((acc, km) => acc + (km.total_value || 0), 0);

    // Initialize detailed stats structures
    const blueTeamKillIds: number[] = [];
    const redTeamKillIds: number[] = [];
    const blueTeamStats: ITeamSummaryStats = { iskLost: 0, shipsLost: 0, damageInflicted: 0 };
    const redTeamStats: ITeamSummaryStats = { iskLost: 0, shipsLost: 0, damageInflicted: 0 };

    const blueTeamAlliancesStatsMap: Map<number, IEntityStats> = new Map();
    const redTeamAlliancesStatsMap: Map<number, IEntityStats> = new Map();
    const blueTeamCorporationsStatsMap: Map<number, IEntityStats> = new Map();
    const redTeamCorporationsStatsMap: Map<number, IEntityStats> = new Map();
    const blueTeamCharactersStatsMap: Map<number, IEntityStats> = new Map();
    const redTeamCharactersStatsMap: Map<number, IEntityStats> = new Map();

    // Create Sets for team lookups from teamsData
    const blueTeamAllianceIds = new Set<number>(teamsData.blue_team.alliances.map((a: any) => a.id));
    const blueTeamCorpIds = new Set<number>(teamsData.blue_team.corporations.map((c: any) => c.id));
    const redTeamAllianceIds = new Set<number>(teamsData.red_team.alliances.map((a: any) => a.id));
    const redTeamCorpIds = new Set<number>(teamsData.red_team.corporations.map((c: any) => c.id));

    for (const killmail of allKillmailsInvolved) {
        const victim = killmail.victim;
        const attackers = killmail.attackers || []; // Ensure attackers is an array
        const totalValue = killmail.total_value || 0;
        const damageTaken = victim.damage_taken || 0;

        // STEP 1: Identify the victim's team first
        let victimIsBlue = false;
        let victimIsRed = false;

        if (victim.alliance_id && blueTeamAllianceIds.has(victim.alliance_id)) victimIsBlue = true;
        else if (victim.corporation_id && blueTeamCorpIds.has(victim.corporation_id)) victimIsBlue = true;
        else if (victim.alliance_id && redTeamAllianceIds.has(victim.alliance_id)) victimIsRed = true;
        else if (victim.corporation_id && redTeamCorpIds.has(victim.corporation_id)) victimIsRed = true;
        else {
            // Default assignment for neutrals/unassigned entities
            victimIsRed = true;
        }

        // STEP 2: Identify the killing team by examining primary attacker
        let killingTeamIsBlue = false;
        let killingTeamIsRed = false;

        // Find the primary attacker (final blow or highest damage dealer)
        const finalBlowAttacker = attackers.find(a => a.final_blow);
        const sortedAttackers = [...attackers].sort((a, b) => (b.damage_done || 0) - (a.damage_done || 0));
        const primaryAttacker = finalBlowAttacker || (sortedAttackers.length > 0 ? sortedAttackers[0] : null);

        // Determine which team the primary attacker is on
        if (primaryAttacker) {
            if (primaryAttacker.alliance_id && blueTeamAllianceIds.has(primaryAttacker.alliance_id)) killingTeamIsBlue = true;
            else if (primaryAttacker.corporation_id && blueTeamCorpIds.has(primaryAttacker.corporation_id)) killingTeamIsBlue = true;
            else if (primaryAttacker.alliance_id && redTeamAllianceIds.has(primaryAttacker.alliance_id)) killingTeamIsRed = true;
            else if (primaryAttacker.corporation_id && redTeamCorpIds.has(primaryAttacker.corporation_id)) killingTeamIsRed = true;
        }

        // STEP 3: If we couldn't determine killing team from attackers, use the fundamental rule:
        // Attackers must be from opposite team as victim
        if (!killingTeamIsBlue && !killingTeamIsRed) {
            // If victim is blue, killer must be red and vice versa
            killingTeamIsBlue = victimIsRed;
            killingTeamIsRed = victimIsBlue;
        }

        // STEP 4: Special case protection - if teams still can't be determined (unlikely)
        // Default to assigning kill credit to opposite team of victim
        if (!killingTeamIsBlue && !killingTeamIsRed) {
            killingTeamIsBlue = !victimIsBlue;
            killingTeamIsRed = !victimIsRed;
        }

        // STEP 5: Process kill statistics based on determined teams
        if (killingTeamIsRed) {
            // Red team gets credit for the kill
            blueTeamKillIds.push(killmail.killmail_id);

            // Track victim stats on their team
            if (victimIsBlue) {
                blueTeamStats.shipsLost += 1;
                blueTeamStats.iskLost += totalValue;
                redTeamStats.damageInflicted += damageTaken;

                trackVictimStatsOnMap(blueTeamCharactersStatsMap, victim.character_id, victim.character_name, totalValue);
                trackVictimStatsOnMap(blueTeamCorporationsStatsMap, victim.corporation_id, victim.corporation_name, totalValue, victim.alliance_id, victim.alliance_name);
                if (victim.alliance_id && victim.alliance_name) { // Ensure alliance_name is present
                    trackVictimStatsOnMap(blueTeamAlliancesStatsMap, victim.alliance_id, victim.alliance_name, totalValue);
                }
            } else {
                // Handle friendly fire case (red killed red)
                redTeamStats.shipsLost += 1;
                redTeamStats.iskLost += totalValue;
                redTeamStats.damageInflicted += damageTaken;

                trackVictimStatsOnMap(redTeamCharactersStatsMap, victim.character_id, victim.character_name, totalValue);
                trackVictimStatsOnMap(redTeamCorporationsStatsMap, victim.corporation_id, victim.corporation_name, totalValue, victim.alliance_id, victim.alliance_name);
                if (victim.alliance_id && victim.alliance_name) {
                    trackVictimStatsOnMap(redTeamAlliancesStatsMap, victim.alliance_id, victim.alliance_name, totalValue);
                }
            }

            // Track attacker stats on red team
            const attributingRedAttacker = getAttributingAttackerFromTeam(attackers, redTeamAllianceIds, redTeamCorpIds);
            if (attributingRedAttacker) {
                trackAttackerStatsOnMap(redTeamCharactersStatsMap, attributingRedAttacker.character_id, attributingRedAttacker.character_name, totalValue);
                trackAttackerStatsOnMap(redTeamCorporationsStatsMap, attributingRedAttacker.corporation_id, attributingRedAttacker.corporation_name, totalValue, attributingRedAttacker.alliance_id, attributingRedAttacker.alliance_name);
                if (attributingRedAttacker.alliance_id && attributingRedAttacker.alliance_name) {
                    trackAttackerStatsOnMap(redTeamAlliancesStatsMap, attributingRedAttacker.alliance_id, attributingRedAttacker.alliance_name, totalValue);
                }
            }
        } else if (killingTeamIsBlue) {
            // Blue team gets credit for the kill
            redTeamKillIds.push(killmail.killmail_id);

            // Track victim stats on their team
            if (victimIsRed) {
                redTeamStats.shipsLost += 1;
                redTeamStats.iskLost += totalValue;
                blueTeamStats.damageInflicted += damageTaken;

                trackVictimStatsOnMap(redTeamCharactersStatsMap, victim.character_id, victim.character_name, totalValue);
                trackVictimStatsOnMap(redTeamCorporationsStatsMap, victim.corporation_id, victim.corporation_name, totalValue, victim.alliance_id, victim.alliance_name);
                if (victim.alliance_id && victim.alliance_name) {
                    trackVictimStatsOnMap(redTeamAlliancesStatsMap, victim.alliance_id, victim.alliance_name, totalValue);
                }
            } else {
                // Handle friendly fire case (blue killed blue)
                blueTeamStats.shipsLost += 1;
                blueTeamStats.iskLost += totalValue;
                blueTeamStats.damageInflicted += damageTaken;

                trackVictimStatsOnMap(blueTeamCharactersStatsMap, victim.character_id, victim.character_name, totalValue);
                trackVictimStatsOnMap(blueTeamCorporationsStatsMap, victim.corporation_id, victim.corporation_name, totalValue, victim.alliance_id, victim.alliance_name);
                if (victim.alliance_id && victim.alliance_name) {
                    trackVictimStatsOnMap(blueTeamAlliancesStatsMap, victim.alliance_id, victim.alliance_name, totalValue);
                }
            }

            // Track attacker stats on blue team
            const attributingBlueAttacker = getAttributingAttackerFromTeam(attackers, blueTeamAllianceIds, blueTeamCorpIds);
            if (attributingBlueAttacker) {
                trackAttackerStatsOnMap(blueTeamCharactersStatsMap, attributingBlueAttacker.character_id, attributingBlueAttacker.character_name, totalValue);
                trackAttackerStatsOnMap(blueTeamCorporationsStatsMap, attributingBlueAttacker.corporation_id, attributingBlueAttacker.corporation_name, totalValue, attributingBlueAttacker.alliance_id, attributingBlueAttacker.alliance_name);
                if (attributingBlueAttacker.alliance_id && attributingBlueAttacker.alliance_name) {
                    trackAttackerStatsOnMap(blueTeamAlliancesStatsMap, attributingBlueAttacker.alliance_id, attributingBlueAttacker.alliance_name, totalValue);
                }
            }
        }
    }

    // General battle info (can remain as is, or be derived from allKillmailsInvolved if not already)
    const alliancesInvolvedSet = new Set<number>();
    const corporationsInvolvedSet = new Set<number>();
    const charactersInvolvedSet = new Set<number>();

    allKillmailsInvolved.forEach(km => {
        if (km.victim.alliance_id) alliancesInvolvedSet.add(km.victim.alliance_id);
        if (km.victim.corporation_id) corporationsInvolvedSet.add(km.victim.corporation_id);
        if (km.victim.character_id) charactersInvolvedSet.add(km.victim.character_id);
        (km.attackers || []).forEach(a => {
            if (a.alliance_id) alliancesInvolvedSet.add(a.alliance_id);
            if (a.corporation_id) corporationsInvolvedSet.add(a.corporation_id);
            if (a.character_id) charactersInvolvedSet.add(a.character_id);
        });
    });

    const alliancesInvolvedList = Array.from(alliancesInvolvedSet);
    const corporationsInvolvedList = Array.from(corporationsInvolvedSet);
    const charactersInvolvedList = Array.from(charactersInvolvedSet);

    const battleDocument: IBattlesDocument = {
        battle_id,
        start_time: battleStartTime,
        end_time: battleEndTime,
        duration_ms,
        system_id: systemId,
        system_name: systemInfo?.system_name || "Unknown System",
        region_name: regionInfo?.name || { en: "Unknown Region" },
        system_security: systemInfo?.security ?? 0.0,
        killmailsCount,
        iskDestroyed,

        alliancesInvolved: alliancesInvolvedList,
        corporationsInvolved: corporationsInvolvedList,
        charactersInvolved: charactersInvolvedList,
        involved_alliances_count: alliancesInvolvedList.length,
        involved_corporations_count: corporationsInvolvedList.length,
        involved_characters_count: charactersInvolvedList.length,

        top_alliances: getTopEntities(allKillmailsInvolved, 'alliance'),
        top_corporations: getTopEntities(allKillmailsInvolved, 'corporation'),
        top_ship_types: getTopShipTypes(allKillmailsInvolved),

        blue_team: teamsData.blue_team,
        red_team: teamsData.red_team,

        killmail_ids: allKillmailsInvolved.sort((a, b) => new Date(a.kill_time).getTime() - new Date(b.kill_time).getTime()).map(km => km.killmail_id), // Sort and map to IDs

        blue_team_kill_ids: blueTeamKillIds,
        red_team_kill_ids: redTeamKillIds,
        blue_team_stats: blueTeamStats,
        red_team_stats: redTeamStats,
        blue_team_alliances_stats: Array.from(blueTeamAlliancesStatsMap.values()).sort((a, b) => b.kills - a.kills || b.valueInflicted - a.valueInflicted || a.losses - b.losses),
        red_team_alliances_stats: Array.from(redTeamAlliancesStatsMap.values()).sort((a, b) => b.kills - a.kills || b.valueInflicted - a.valueInflicted || a.losses - b.losses),
        blue_team_corporations_stats: Array.from(blueTeamCorporationsStatsMap.values()).sort((a, b) => b.kills - a.kills || b.valueInflicted - a.valueInflicted || a.losses - b.losses),
        red_team_corporations_stats: Array.from(redTeamCorporationsStatsMap.values()).sort((a, b) => b.kills - a.kills || b.valueInflicted - a.valueInflicted || a.losses - b.losses),
        blue_team_characters_stats: Array.from(blueTeamCharactersStatsMap.values()).sort((a, b) => b.kills - a.kills || b.valueInflicted - a.valueInflicted || a.losses - b.losses),
        red_team_characters_stats: Array.from(redTeamCharactersStatsMap.values()).sort((a, b) => b.kills - a.kills || b.valueInflicted - a.valueInflicted || a.losses - b.losses),
    };

    return battleDocument;
}

interface IBattleParty {
    alliances: { id: number; name: string }[];
    corporations: { id: number; name: string }[];
}

/**
 * Finds battle ID and timeframe for a given killmail if it exists
 * @param killmail_id The killmail ID to check
 * @returns Battle information or null if no battle exists
 */
export async function findBattleForKillmail(killmail_id: number): Promise<{
    battle_id: any,
    startTime: Date,
    endTime: Date,
    systemId: number
} | null> {
    const killmail: IKillmail | null = await Killmails.findOne({
        killmail_id: killmail_id,
    }, { _id: 0, system_id: 1, kill_time: 1 });

    if (!killmail) {
        return null;
    }

    const killTime = new Date(killmail.kill_time);
    const systemId = killmail.system_id;

    const startTime = new Date(killTime.getTime() - 3600 * 1000);
    const endTime = new Date(killTime.getTime() + 3600 * 1000);

    const pipeline = [
        {
            '$match': {
                'system_id': systemId,
                'kill_time': { '$gte': startTime, '$lt': endTime },
            }
        },
        {
            '$group': {
                '_id': '$battle_id',
                'count': { '$sum': 1 },
            }
        },
        {
            '$match': {
                'count': {
                    '$gte': 10,
                }
            }
        },
        {
            '$sort': {
                'count': -1 as 1 | -1,
            }
        },
        {
            '$limit': 1,
        }
    ];

    const result = await Killmails.aggregate(pipeline, { allowDiskUse: true });
    if (result.length === 0) {
        return null;
    }

    return {
        battle_id: result[0]._id,
        startTime,
        endTime,
        systemId
    };
}

export async function isKillInBattle(killmail_id: number): Promise<boolean> {
    const battle = await findBattleForKillmail(killmail_id);
    return battle !== null;
}

export async function getBattleData(killmail_id: number): Promise<IBattlesDocument | null> {
    const battleInfo = await findBattleForKillmail(killmail_id);

    if (!battleInfo) {
        return null;
    }

    const { battle_id, startTime, endTime, systemId } = battleInfo;

    const matchCriteria: any = {
        kill_time: { $gte: startTime, $lt: endTime },
        system_id: systemId,
    };

    if (battle_id) {
        matchCriteria.battle_id = battle_id;
    }

    const killmails: IKillmail[] = await Killmails.find(
        matchCriteria,
        // Project only necessary fields for compileFullBattleData and its helpers
        {
            _id: 0,
            killmail_id: 1,
            kill_time: 1,
            system_id: 1,
            total_value: 1,
            victim: 1, // Includes alliance_id, corporation_id, character_id, ship_id, ship_name
            attackers: 1, // Includes alliance_id, corporation_id, character_id, ship_id, ship_name
            // system_name, region_name, system_security are fetched by compileFullBattleData
        }
    ).lean();


    if (killmails.length === 0) {
        return null;
    }

    const fullBattleObject = await compileFullBattleData(killmails, systemId, startTime, endTime, battle_id);

    return fullBattleObject;
}

export function processBattle(
    killmails: IKillmail[],
    systemId: number,
    battleStartTime: Date,
    battleEndTime: Date
): any {
    // Entity data structures
    const corpDetails: Map<number, {
        name: string,
        allianceId?: number,
        characterIds: Set<number>,
        attackedBy: Map<number, number>,  // Map of corps that attacked this corp, with attack count
        attacked: Map<number, number>     // Map of corps that this corp attacked, with attack count
    }> = new Map();

    const allianceDetails: Map<number, {
        name: string,
        characterIds: Set<number>,
        memberCorpIds: Set<number>,
        attackedBy: Map<number, number>,  // Map of alliances that attacked this alliance, with attack count
        attacked: Map<number, number>     // Map of alliances that this alliance attacked, with attack count
    }> = new Map();

    // Maps to track whether entities are opposing each other
    // These sets contain pairs of IDs that are on opposite sides
    const opposingCorps: Set<string> = new Set();
    const opposingAlliances: Set<string> = new Set();

    // 1. First Pass: Collect entity details and build interaction data
    for (const killmail of killmails) {
        const victim = killmail.victim;
        const victimCorpId = victim.corporation_id;
        const victimCorpName = victim.corporation_name || 'Unknown Corporation';
        const victimAllianceId = victim.alliance_id;
        const victimAllianceName = victim.alliance_name || 'Unknown Alliance';
        const victimCharacterId = victim.character_id;
        const attackers = killmail.attackers || [];

        // Initialize victim corporation if not present
        if (victimCorpId && !corpDetails.has(victimCorpId)) {
            corpDetails.set(victimCorpId, {
                name: victimCorpName,
                allianceId: victimAllianceId,
                characterIds: new Set(),
                attackedBy: new Map(),
                attacked: new Map()
            });
        }

        // Add victim character to their corporation
        if (victimCorpId && victimCharacterId) {
            corpDetails.get(victimCorpId)!.characterIds.add(victimCharacterId);
        }

        // Initialize victim alliance if not present
        if (victimAllianceId && !allianceDetails.has(victimAllianceId)) {
            allianceDetails.set(victimAllianceId, {
                name: victimAllianceName,
                characterIds: new Set(),
                memberCorpIds: new Set(),
                attackedBy: new Map(),
                attacked: new Map()
            });
        }

        // Add victim character and corp to their alliance
        if (victimAllianceId) {
            if (victimCharacterId) allianceDetails.get(victimAllianceId)!.characterIds.add(victimCharacterId);
            if (victimCorpId) allianceDetails.get(victimAllianceId)!.memberCorpIds.add(victimCorpId);
        }

        // Process attackers
        for (const attacker of attackers) {
            const attackerCorpId = attacker.corporation_id;
            const attackerCorpName = attacker.corporation_name || 'Unknown Corporation';
            const attackerAllianceId = attacker.alliance_id;
            const attackerAllianceName = attacker.alliance_name || 'Unknown Alliance';
            const attackerCharacterId = attacker.character_id;

            // Skip if no corporation ID (likely NPC)
            if (!attackerCorpId) continue;

            // Initialize attacker corporation if not present
            if (!corpDetails.has(attackerCorpId)) {
                corpDetails.set(attackerCorpId, {
                    name: attackerCorpName,
                    allianceId: attackerAllianceId,
                    characterIds: new Set(),
                    attackedBy: new Map(),
                    attacked: new Map()
                });
            }

            // Add attacker character to their corporation
            if (attackerCharacterId) {
                corpDetails.get(attackerCorpId)!.characterIds.add(attackerCharacterId);
            }

            // Initialize attacker alliance if not present
            if (attackerAllianceId && !allianceDetails.has(attackerAllianceId)) {
                allianceDetails.set(attackerAllianceId, {
                    name: attackerAllianceName,
                    characterIds: new Set(),
                    memberCorpIds: new Set(),
                    attackedBy: new Map(),
                    attacked: new Map()
                });
            }

            // Add attacker character and corp to their alliance
            if (attackerAllianceId) {
                if (attackerCharacterId) allianceDetails.get(attackerAllianceId)!.characterIds.add(attackerCharacterId);
                if (attackerCorpId) allianceDetails.get(attackerAllianceId)!.memberCorpIds.add(attackerCorpId);
            }

            // Record the interaction between attacker and victim corps
            if (victimCorpId && attackerCorpId && victimCorpId !== attackerCorpId) {
                // Record that the victim was attacked by the attacker
                const attackedByMap = corpDetails.get(victimCorpId)!.attackedBy;
                attackedByMap.set(attackerCorpId, (attackedByMap.get(attackerCorpId) || 0) + 1);

                // Record that the attacker attacked the victim
                const attackedMap = corpDetails.get(attackerCorpId)!.attacked;
                attackedMap.set(victimCorpId, (attackedMap.get(victimCorpId) || 0) + 1);

                // Record that these corps are opposing each other
                // We store both directions to make lookups faster
                opposingCorps.add(`${victimCorpId}-${attackerCorpId}`);
                opposingCorps.add(`${attackerCorpId}-${victimCorpId}`);
            }

            // Record the interaction between alliances
            if (victimAllianceId && attackerAllianceId && victimAllianceId !== attackerAllianceId) {
                // Record that the victim alliance was attacked by the attacker alliance
                const attackedByMap = allianceDetails.get(victimAllianceId)!.attackedBy;
                attackedByMap.set(attackerAllianceId, (attackedByMap.get(attackerAllianceId) || 0) + 1);

                // Record that the attacker alliance attacked the victim alliance
                const attackedMap = allianceDetails.get(attackerAllianceId)!.attacked;
                attackedMap.set(victimAllianceId, (attackedMap.get(victimAllianceId) || 0) + 1);

                // Record that these alliances are opposing each other
                opposingAlliances.add(`${victimAllianceId}-${attackerAllianceId}`);
                opposingAlliances.add(`${attackerAllianceId}-${victimAllianceId}`);
            }
        }
    }

    // 2. Determine Teams based on interactions
    const assignedCorpTeams: Map<number, 'blue' | 'red'> = new Map();
    const assignedAllianceTeams: Map<number, 'blue' | 'red'> = new Map();

    // Create a list of all interaction pairs, sorted by intensity
    const corpInteractions: { corp1: number, corp2: number, intensity: number }[] = [];

    // Add corporation interactions
    corpDetails.forEach((corpDetail, corpId) => {
        // Process the 'attackedBy' data
        corpDetail.attackedBy.forEach((count, otherCorpId) => {
            corpInteractions.push({
                corp1: corpId,
                corp2: otherCorpId,
                intensity: count
            });
        });
    });

    // Sort interactions by intensity (highest first)
    corpInteractions.sort((a, b) => b.intensity - a.intensity);

    // First, assign teams to corporations based on strongest interactions
    for (const interaction of corpInteractions) {
        const corp1 = interaction.corp1;
        const corp2 = interaction.corp2;

        // Skip if both corps are already assigned
        if (assignedCorpTeams.has(corp1) && assignedCorpTeams.has(corp2)) {
            // Ensure they're on opposite teams if they should be
            if (opposingCorps.has(`${corp1}-${corp2}`) &&
                assignedCorpTeams.get(corp1) === assignedCorpTeams.get(corp2)) {
                // Conflict: they're on the same team but should be opposing
                // Resolve by moving the second corp to the opposite team
                const currentTeam = assignedCorpTeams.get(corp2)!;
                const newTeam = currentTeam === 'blue' ? 'red' : 'blue';
                assignedCorpTeams.set(corp2, newTeam);
            }
            continue;
        }

        // If neither is assigned, assign them to opposite teams
        if (!assignedCorpTeams.has(corp1) && !assignedCorpTeams.has(corp2)) {
            assignedCorpTeams.set(corp1, 'blue');
            assignedCorpTeams.set(corp2, 'red');
            continue;
        }

        // If only one is assigned, put the other on the opposite team
        if (assignedCorpTeams.has(corp1)) {
            const team1 = assignedCorpTeams.get(corp1)!;
            assignedCorpTeams.set(corp2, team1 === 'blue' ? 'red' : 'blue');
        } else {
            const team2 = assignedCorpTeams.get(corp2)!;
            assignedCorpTeams.set(corp1, team2 === 'blue' ? 'red' : 'blue');
        }
    }

    // Second, assign teams to alliances based on corporation teams
    allianceDetails.forEach((allianceDetail, allianceId) => {
        let blueCount = 0;
        let redCount = 0;

        // Count corps in each team
        allianceDetail.memberCorpIds.forEach(corpId => {
            if (assignedCorpTeams.get(corpId) === 'blue') {
                blueCount++;
            } else if (assignedCorpTeams.get(corpId) === 'red') {
                redCount++;
            }
        });

        // Assign alliance to the team with most corps
        if (blueCount > redCount) {
            assignedAllianceTeams.set(allianceId, 'blue');
        } else if (redCount > blueCount) {
            assignedAllianceTeams.set(allianceId, 'red');
        }
        // If tied, alliance remains unassigned for now
    });

    // Third, ensure alliances are on opposing sides if they've fought each other
    for (const opposingPair of opposingAlliances) {
        const [alliance1, alliance2] = opposingPair.split('-').map(Number);

        // Skip if either alliance hasn't been assigned to a team
        if (!assignedAllianceTeams.has(alliance1) || !assignedAllianceTeams.has(alliance2)) {
            continue;
        }

        // If both alliances are on the same team but should be opposing, resolve conflict
        if (assignedAllianceTeams.get(alliance1) === assignedAllianceTeams.get(alliance2)) {
            // We'll reassign the alliance with fewer member corps
            const alliance1CorpCount = allianceDetails.get(alliance1)?.memberCorpIds.size || 0;
            const alliance2CorpCount = allianceDetails.get(alliance2)?.memberCorpIds.size || 0;

            if (alliance1CorpCount <= alliance2CorpCount) {
                assignedAllianceTeams.set(
                    alliance1,
                    assignedAllianceTeams.get(alliance1) === 'blue' ? 'red' : 'blue'
                );
            } else {
                assignedAllianceTeams.set(
                    alliance2,
                    assignedAllianceTeams.get(alliance2) === 'blue' ? 'red' : 'blue'
                );
            }
        }
    }

    // Fourth, ensure corp team assignments match their alliance's team
    assignedAllianceTeams.forEach((allianceTeam, allianceId) => {
        const alliance = allianceDetails.get(allianceId);
        if (alliance) {
            alliance.memberCorpIds.forEach(corpId => {
                if (assignedCorpTeams.get(corpId) !== allianceTeam) {
                    assignedCorpTeams.set(corpId, allianceTeam);
                }
            });
        }
    });

    // 5. Final verification pass: ensure no opposing entities are on the same team
    // This could happen due to alliance cohesion forcing corps onto the same team
    for (const opposingPair of opposingCorps) {
        const [corp1, corp2] = opposingPair.split('-').map(Number);

        if (assignedCorpTeams.get(corp1) === assignedCorpTeams.get(corp2)) {
            // Conflict!
            // If one corp is in an alliance and the other isn't, move the unaligned corp
            const corp1AllianceId = corpDetails.get(corp1)?.allianceId;
            const corp2AllianceId = corpDetails.get(corp2)?.allianceId;

            if (corp1AllianceId && assignedAllianceTeams.has(corp1AllianceId) &&
                (!corp2AllianceId || !assignedAllianceTeams.has(corp2AllianceId))) {
                // Move corp2 to opposite team
                assignedCorpTeams.set(corp2, assignedCorpTeams.get(corp1) === 'blue' ? 'red' : 'blue');
            } else if (corp2AllianceId && assignedAllianceTeams.has(corp2AllianceId) &&
                (!corp1AllianceId || !assignedAllianceTeams.has(corp1AllianceId))) {
                // Move corp1 to opposite team
                assignedCorpTeams.set(corp1, assignedCorpTeams.get(corp2) === 'blue' ? 'red' : 'blue');
            }
            // If both are in alliances, we don't move them (alliance cohesion takes precedence)
        }
    }

    // 6. Format Output
    const blueTeam: IBattleParty = { alliances: [], corporations: [] };
    const redTeam: IBattleParty = { alliances: [], corporations: [] };

    const processedAllianceIdsBlue = new Set<number>();
    const processedAllianceIdsRed = new Set<number>();

    // Add all assigned corporations to their teams
    assignedCorpTeams.forEach((team, corpId) => {
        const corpInfo = corpDetails.get(corpId);
        if (!corpInfo) return;

        const targetTeam = team === 'blue' ? blueTeam : redTeam;
        const processedAllianceIds = team === 'blue' ? processedAllianceIdsBlue : processedAllianceIdsRed;

        // Check if this corp belongs to an alliance that's on the same team
        if (corpInfo.allianceId &&
            assignedAllianceTeams.has(corpInfo.allianceId) &&
            assignedAllianceTeams.get(corpInfo.allianceId) === team) {

            // Add alliance if not already added
            if (!processedAllianceIds.has(corpInfo.allianceId)) {
                targetTeam.alliances.push({
                    id: corpInfo.allianceId,
                    name: allianceDetails.get(corpInfo.allianceId)!.name
                });
                processedAllianceIds.add(corpInfo.allianceId);
            }
        } else {
            // Corp is not in an alliance or its alliance is on another team
            targetTeam.corporations.push({ id: corpId, name: corpInfo.name });
        }
    });

    // Ensure corps that are part of an alliance on a team are not also listed standalone
    blueTeam.corporations = blueTeam.corporations.filter(corp => {
        const corpInfo = corpDetails.get(corp.id);
        return !(corpInfo?.allianceId && processedAllianceIdsBlue.has(corpInfo.allianceId));
    });

    redTeam.corporations = redTeam.corporations.filter(corp => {
        const corpInfo = corpDetails.get(corp.id);
        return !(corpInfo?.allianceId && processedAllianceIdsRed.has(corpInfo.allianceId));
    });

    return {
        start_time: battleStartTime,
        end_time: battleEndTime,
        system_id: systemId,
        blue_team: blueTeam,
        red_team: redTeam,
    };
}
