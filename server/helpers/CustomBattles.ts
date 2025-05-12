import crypto from "crypto";
import {
    IBattles as IBattlesDocument,
    ICharacterShipManifestEntry,
    IEntityStats,
    ITeamSummaryStats
} from "../interfaces/IBattles";
import { IAttacker, IKillmail } from "../interfaces/IKillmail";
import type { ITranslation } from "../interfaces/ITranslation";
import { Killmails } from "../models/Killmails";
import { Regions } from "../models/Regions";
import { SolarSystems } from "../models/SolarSystems";

// Constant definitions
const CAPSULE_IDS = [670, 33328]; // Standard Capsule, Genolution Capsule

// Interface for dynamic team structure
interface ITeam {
    name: string;
    alliances: Array<{ id: number; name?: string }>;
    corporations: Array<{ id: number; name?: string }>;
}

// Interface for team stats tracking
interface TeamStatsData {
    killIds: number[];
    stats: ITeamSummaryStats;
    alliancesStatsMap: Map<number, IEntityStats>;
    corporationsStatsMap: Map<number, IEntityStats>;
    charactersStatsMap: Map<number, IEntityStats>;
    shipManifestMap: Map<string, ICharacterShipManifestEntry>;
}

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
): Array<{ id: number; name: ITranslation; count: number }> {
    const counts: { [key: number]: { id: number; name: ITranslation; count: number } } = {};

    for (const killmail of battleData) {
        // Victim's ship
        const victimShipId = killmail.victim?.ship_id;
        if (victimShipId) {
            const victimShipName = killmail.victim?.ship_name || { en: `Unknown Ship ${victimShipId}` };
            if (!counts[victimShipId]) {
                counts[victimShipId] = { id: victimShipId, name: victimShipName, count: 0 };
            }
            counts[victimShipId].count++;
        }

        // Attackers' ships
        for (const attacker of killmail.attackers || []) {
            const attackerShipId = attacker?.ship_id;
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

// Function to initialize stats data structure for a team
function initializeTeamStatsData(): TeamStatsData {
    return {
        killIds: [],
        stats: { iskLost: 0, shipsLost: 0, damageInflicted: 0 },
        alliancesStatsMap: new Map(),
        corporationsStatsMap: new Map(),
        charactersStatsMap: new Map(),
        shipManifestMap: new Map()
    };
}

// Helper functions remain unchanged
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

function trackVictimStatsOnMap(map: Map<number, IEntityStats>, id: number | undefined, name: string | undefined, valueSuffered: number, allianceId?: number, allianceName?: string) {
    if (!id || !name) return; // Ensure id and name are present
    const stats = initializeEntityStatsMap(map, id, name, allianceId, allianceName);
    stats.losses += 1;
    stats.valueSuffered += valueSuffered;
}

function trackAttackerStatsOnMap(map: Map<number, IEntityStats>, id: number | undefined, name: string | undefined, valueInflicted: number, allianceId?: number, allianceName?: string) {
    if (!id || !name) return; // Ensure id and name are present
    const stats = initializeEntityStatsMap(map, id, name, allianceId, allianceName);
    stats.kills += 1;
    stats.valueInflicted += valueInflicted;
}

function getAttributingAttackerFromTeam(
    attackers: IAttacker[],
    teamAllianceIds: Set<number>,
    teamCorpIds: Set<number>
): IAttacker | null {
    if (!attackers || attackers.length === 0) {
        return null;
    }

    const finalBlowAttacker = attackers.find(a => a.final_blow);
    if (finalBlowAttacker) {
        if (
            (finalBlowAttacker.alliance_id && teamAllianceIds.has(finalBlowAttacker.alliance_id)) ||
            (finalBlowAttacker.corporation_id && teamCorpIds.has(finalBlowAttacker.corporation_id))
        ) {
            return finalBlowAttacker;
        }
    }

    const sortedAttackers = [...attackers].sort((a, b) => (b.damage_done || 0) - (a.damage_done || 0));
    for (const attacker of sortedAttackers) {
        if ((attacker.damage_done || 0) <= 0) break;
        if (
            (attacker.alliance_id && teamAllianceIds.has(attacker.alliance_id)) ||
            (attacker.corporation_id && teamCorpIds.has(attacker.corporation_id))
        ) {
            return attacker;
        }
    }
    return null;
}

export async function compileFullBattleData(
    allKillmailsInvolved: IKillmail[],
    systemIds: number[],
    battleStartTime: Date,
    battleEndTime: Date,
    existingBattleId?: number | string,
    manualTeams?: Record<string, ITeam>
): Promise<IBattlesDocument> {
    let battle_id: number;

    // When using manual teams, skip all the automatic team detection logic
    const teamsData = manualTeams || { blue: { name: "Team A", alliances: [], corporations: [] }, red: { name: "Team B", alliances: [], corporations: [] } };
    const teamIds = Object.keys(teamsData);

    // Generate battle ID or use provided one
    if (existingBattleId) {
        battle_id = Number(existingBattleId);
    } else {
        const dataToHash = {
            systemIds,
            startTime: battleStartTime.toISOString(),
            endTime: battleEndTime.toISOString(),
            teams: teamsData
        };
        const hash = crypto.createHash('sha256').update(JSON.stringify(dataToHash)).digest('hex');
        battle_id = parseInt(hash.substring(0, 10), 16);
    }

    // Fetch information for all systems
    const systemsInfo = await SolarSystems.find(
        { system_id: { $in: systemIds } },
        { system_id: 1, system_name: 1, region_id: 1, security: 1 }
    ).lean();

    // Get all region IDs from the systems
    const regionIds = Array.from(new Set(systemsInfo.map(system => system.region_id).filter(id => id)));

    // Fetch information for all regions
    const regionsInfo = await Regions.find(
        { region_id: { $in: regionIds } },
        { region_id: 1, name: 1 }
    ).lean();

    // Create a map for quick region lookup
    const regionMap = new Map(regionsInfo.map(region => [region.region_id, region]));

    // Create enhanced systems array with all details
    const systems = systemsInfo.map(system => ({
        system_id: system.system_id,
        system_name: system.system_name || "Unknown System",
        system_security: system.security || 0,
        region_id: system.region_id || 0,
        region_name: system.region_id && regionMap.has(system.region_id)
            ? regionMap.get(system.region_id)?.name
            : { en: "Unknown Region" }
    }));

    const duration_ms = battleEndTime.getTime() - battleStartTime.getTime();
    const killmailsCount = allKillmailsInvolved.length;
    const iskDestroyed = allKillmailsInvolved.reduce((acc, km) => acc + (km.total_value || 0), 0);

    // Create lookup maps for each team's entities
    const teamEntityMaps = createTeamEntityMaps(teamsData);

    // Initialize stats tracking for each team
    const teamStats: Record<string, TeamStatsData> = {};
    teamIds.forEach(teamId => {
        teamStats[teamId] = initializeTeamStatsData();
    });

    // Create a damage tracking map for character + ship combinations across all killmails
    const damageDoneTracker: Map<string, { characterId: number, shipId: number, totalDamage: number }> = new Map();

    // First pass: Track damage done by all characters with their ships
    for (const killmail of allKillmailsInvolved) {
        const attackers = killmail.attackers || [];

        // Process each attacker's damage contribution
        for (const attacker of attackers) {
            if (attacker.character_id && attacker.ship_id && typeof attacker.damage_done === 'number') {
                const key = `${attacker.character_id}-${attacker.ship_id}`;

                if (!damageDoneTracker.has(key)) {
                    damageDoneTracker.set(key, {
                        characterId: attacker.character_id,
                        shipId: attacker.ship_id,
                        totalDamage: 0
                    });
                }

                // Add this killmail's damage to the tracker
                const trackerEntry = damageDoneTracker.get(key)!;
                trackerEntry.totalDamage += attacker.damage_done;
            }
        }
    }

    // Process each killmail to calculate stats for all teams
    for (const killmail of allKillmailsInvolved) {
        const victim = killmail.victim;
        const attackers = killmail.attackers || [];
        const totalValue = killmail.total_value || 0;
        const damageTaken = victim.damage_taken || 0;

        // Identify the victim's team
        let victimTeam: string | null = null;
        for (const [teamId, entityMap] of Object.entries(teamEntityMaps)) {
            if (
                (victim.alliance_id && entityMap.allianceIds.has(victim.alliance_id)) ||
                (victim.corporation_id && entityMap.corporationIds.has(victim.corporation_id))
            ) {
                victimTeam = teamId;
                break;
            }
        }

        // Process victim ship for manifest
        if (victim.ship_id && victim.character_id) {
            const key = `${victim.character_id}-${victim.ship_id}`;

            // Get the total damage done by this character+ship combination
            const totalDamageDealt = damageDoneTracker.get(key)?.totalDamage || 0;

            const shipEntry: ICharacterShipManifestEntry = {
                character_id: victim.character_id,
                character_name: victim.character_name,
                corporation_id: victim.corporation_id,
                corporation_name: victim.corporation_name,
                alliance_id: victim.alliance_id,
                alliance_name: victim.alliance_name,
                ship_type_id: victim.ship_id,
                ship_name: victim.ship_name || { en: `Unknown Ship ${victim.ship_id}` },
                ship_group_id: victim.ship_group_id,
                ship_group_name: victim.ship_group_name,
                was_lost: true,
                killmail_id_if_lost: killmail.killmail_id,
                damage_taken: damageTaken,  // Add damage taken from this killmail
                damage_dealt: totalDamageDealt // Add total damage dealt by this character+ship
            };

            // Add to victim team's manifest if victim has a team
            if (victimTeam && teamStats[victimTeam]) {
                teamStats[victimTeam].shipManifestMap.set(key, shipEntry);
            }
        }

        // Process attackers' ships for manifest
        for (const attacker of attackers) {
            if (attacker.ship_id && attacker.character_id) {
                let attackerTeam: string | null = null;
                // Determine attacker's team
                for (const [teamId, entityMap] of Object.entries(teamEntityMaps)) {
                    if (
                        (attacker.alliance_id && entityMap.allianceIds.has(attacker.alliance_id)) ||
                        (attacker.corporation_id && entityMap.corporationIds.has(attacker.corporation_id))
                    ) {
                        attackerTeam = teamId;
                        break;
                    }
                }

                if (attackerTeam) {
                    const key = `${attacker.character_id}-${attacker.ship_id}`;

                    // Get the total damage done by this character+ship combination
                    const totalDamageDealt = damageDoneTracker.get(key)?.totalDamage || 0;

                    // Only add if this character-ship combination doesn't exist yet
                    // or if it exists but was not marked as lost
                    if (!teamStats[attackerTeam].shipManifestMap.has(key) ||
                        !teamStats[attackerTeam].shipManifestMap.get(key)?.was_lost) {

                        teamStats[attackerTeam].shipManifestMap.set(key, {
                            character_id: attacker.character_id,
                            character_name: attacker.character_name,
                            corporation_id: attacker.corporation_id,
                            corporation_name: attacker.corporation_name,
                            alliance_id: attacker.alliance_id,
                            alliance_name: attacker.alliance_name,
                            ship_type_id: attacker.ship_id,
                            ship_name: attacker.ship_name || { en: `Unknown Ship ${attacker.ship_id}` },
                            ship_group_id: attacker.ship_group_id,
                            ship_group_name: attacker.ship_group_name,
                            was_lost: false,
                            damage_taken: 0,  // Not lost, so no damage taken
                            damage_dealt: totalDamageDealt // Add total damage dealt by this character+ship
                        });
                    }
                }
            }
        }

        // Find the team that gets credit for the kill
        let killingTeam: string | null = null;

        // First, check if there's a final blow from a team member
        const finalBlowAttacker = attackers.find(a => a.final_blow);
        if (finalBlowAttacker) {
            for (const [teamId, entityMap] of Object.entries(teamEntityMaps)) {
                if (
                    (finalBlowAttacker.alliance_id && entityMap.allianceIds.has(finalBlowAttacker.alliance_id)) ||
                    (finalBlowAttacker.corporation_id && entityMap.corporationIds.has(finalBlowAttacker.corporation_id))
                ) {
                    killingTeam = teamId;
                    break;
                }
            }
        }

        // If no final blow from a team member, check for highest damage dealer
        if (!killingTeam) {
            const sortedAttackers = [...attackers].sort((a, b) => (b.damage_done || 0) - (a.damage_done || 0));
            for (const attacker of sortedAttackers) {
                if ((attacker.damage_done || 0) <= 0) break;

                for (const [teamId, entityMap] of Object.entries(teamEntityMaps)) {
                    if (
                        (attacker.alliance_id && entityMap.allianceIds.has(attacker.alliance_id)) ||
                        (attacker.corporation_id && entityMap.corporationIds.has(attacker.corporation_id))
                    ) {
                        killingTeam = teamId;
                        break;
                    }
                }

                if (killingTeam) break;
            }
        }

        // If we still couldn't determine the killing team, use the victim's team to infer
        // (assuming the killer is from an opposing team)
        if (!killingTeam && victimTeam && teamIds.length === 2) {
            // If there are only 2 teams, the killer must be from the other team
            killingTeam = teamIds.find(id => id !== victimTeam) || null;
        }

        // Process stats based on determined teams
        if (killingTeam) {
            // Add killmail ID to killer's list
            teamStats[killingTeam].killIds.push(killmail.killmail_id);

            // Track victim stats on their team
            if (victimTeam) {
                // Victim's team loses a ship
                teamStats[victimTeam].stats.shipsLost += 1;
                teamStats[victimTeam].stats.iskLost += totalValue;

                // Killer's team does damage
                if (killingTeam !== victimTeam) { // Don't count friendly fire for damage inflicted
                    teamStats[killingTeam].stats.damageInflicted += damageTaken;
                }

                // Track victim stats in their team's maps
                trackVictimStatsOnMap(teamStats[victimTeam].charactersStatsMap, victim.character_id, victim.character_name, totalValue);
                trackVictimStatsOnMap(teamStats[victimTeam].corporationsStatsMap, victim.corporation_id, victim.corporation_name, totalValue, victim.alliance_id, victim.alliance_name);
                if (victim.alliance_id && victim.alliance_name) {
                    trackVictimStatsOnMap(teamStats[victimTeam].alliancesStatsMap, victim.alliance_id, victim.alliance_name, totalValue);
                }
            }

            // Track attacker stats on killer's team
            // Find the best attacker from the killing team
            const attributingAttacker = getAttributingAttackerFromTeam(
                attackers,
                teamEntityMaps[killingTeam].allianceIds,
                teamEntityMaps[killingTeam].corporationIds
            );

            if (attributingAttacker) {
                trackAttackerStatsOnMap(teamStats[killingTeam].charactersStatsMap, attributingAttacker.character_id, attributingAttacker.character_name, totalValue);
                trackAttackerStatsOnMap(teamStats[killingTeam].corporationsStatsMap, attributingAttacker.corporation_id, attributingAttacker.corporation_name, totalValue, attributingAttacker.alliance_id, attributingAttacker.alliance_name);
                if (attributingAttacker.alliance_id && attributingAttacker.alliance_name) {
                    trackAttackerStatsOnMap(teamStats[killingTeam].alliancesStatsMap, attributingAttacker.alliance_id, attributingAttacker.alliance_name, totalValue);
                }
            }
        }
    }

    // Create the battle document structure without individual system fields at root level
    const battleDocument: Partial<IBattlesDocument> = {
        battle_id,
        start_time: battleStartTime,
        end_time: battleEndTime,
        duration_ms,
        systems, // Enhanced systems array with all details
        killmailsCount,
        iskDestroyed,

        // General battle statistics (entities involved)
        alliancesInvolved: collectInvolvedEntities(allKillmailsInvolved, 'alliance_id'),
        corporationsInvolved: collectInvolvedEntities(allKillmailsInvolved, 'corporation_id'),
        charactersInvolved: collectInvolvedEntities(allKillmailsInvolved, 'character_id'),
        involved_alliances_count: 0,
        involved_corporations_count: 0,
        involved_characters_count: 0,

        top_alliances: getTopEntities(allKillmailsInvolved, 'alliance'),
        top_corporations: getTopEntities(allKillmailsInvolved, 'corporation'),
        top_ship_types: getTopShipTypes(allKillmailsInvolved),

        // All killmails in chronological order
        killmail_ids: allKillmailsInvolved
            .sort((a, b) => new Date(a.kill_time).getTime() - new Date(b.kill_time).getTime())
            .map(km => km.killmail_id),

        // List of all sides
        side_ids: teamIds,

        // Container for all side data
        sides: {}
    } as any;

    // Set counts
    battleDocument.involved_alliances_count = battleDocument.alliancesInvolved?.length || 0;
    battleDocument.involved_corporations_count = battleDocument.corporationsInvolved?.length || 0;
    battleDocument.involved_characters_count = battleDocument.charactersInvolved?.length || 0;

    // Populate the sides object with all side data
    for (const [teamId, teamData] of Object.entries(teamsData)) {
        // Create the side object with all its data
        if (teamStats[teamId]) {
            battleDocument.sides[teamId] = {
                id: teamId,
                name: teamData.name,
                alliances: teamData.alliances,
                corporations: teamData.corporations,
                kill_ids: teamStats[teamId].killIds,
                stats: teamStats[teamId].stats,
                alliances_stats: Array.from(teamStats[teamId].alliancesStatsMap.values())
                    .sort((a, b) => b.kills - a.kills || b.valueInflicted - a.valueInflicted || a.losses - b.losses),
                corporations_stats: Array.from(teamStats[teamId].corporationsStatsMap.values())
                    .sort((a, b) => b.kills - a.kills || b.valueInflicted - a.valueInflicted || a.losses - b.losses),
                characters_stats: Array.from(teamStats[teamId].charactersStatsMap.values())
                    .sort((a, b) => b.kills - a.kills || b.valueInflicted - a.valueInflicted || a.losses - b.losses),
                ship_manifest: Array.from(teamStats[teamId].shipManifestMap.values())
            };
        }
    }

    return battleDocument as IBattlesDocument;
}

function collectInvolvedEntities(killmails: IKillmail[], idField: 'alliance_id' | 'corporation_id' | 'character_id'): number[] {
    const entitySet = new Set<number>();

    killmails.forEach(km => {
        const victimId = km.victim?.[idField];
        if (victimId) entitySet.add(victimId);

        (km.attackers || []).forEach(attacker => {
            const attackerId = attacker[idField];
            if (attackerId) entitySet.add(attackerId);
        });
    });

    return Array.from(entitySet);
}

function createTeamEntityMaps(teamsData: Record<string, ITeam>): Record<string, {
    allianceIds: Set<number>,
    corporationIds: Set<number>
}> {
    const result: Record<string, { allianceIds: Set<number>, corporationIds: Set<number> }> = {};

    for (const [teamId, team] of Object.entries(teamsData)) {
        const allianceIds = new Set<number>(team.alliances.map(a => a.id));
        const corporationIds = new Set<number>(team.corporations.map(c => c.id));
        result[teamId] = { allianceIds, corporationIds };
    }

    return result;
}

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
        {
            _id: 0,
            killmail_id: 1,
            kill_time: 1,
            system_id: 1,
            total_value: 1,
            victim: 1,
            attackers: 1,
        }
    ).lean();

    if (killmails.length === 0) {
        return null;
    }

    const fullBattleObject = await compileFullBattleData(killmails, [systemId], startTime, endTime, battle_id);

    return fullBattleObject;
}
