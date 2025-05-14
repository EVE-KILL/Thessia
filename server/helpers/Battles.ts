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

// Add the interfaces from Battles.ts for the processBattle function
interface IBattleParty {
    alliances: { id: number; name: string }[];
    corporations: { id: number; name: string }[];
}

/**
 * Analyzes killmail data to automatically determine battle teams.
 * Returns team data compatible with compileFullBattleData.
 *
 * @param killmails List of killmails involved in the battle
 * @returns Object with automatically determined teams
 */
export function determineTeamsFromKillmails(
    killmails: IKillmail[]
): Record<string, ITeam> {
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

    // 6. Format Output to match ITeam structure expected by compileFullBattleData
    const blueTeam: ITeam = { name: "Team A", alliances: [], corporations: [] };
    const redTeam: ITeam = { name: "Team B", alliances: [], corporations: [] };

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

    // Return in the format expected by compileFullBattleData
    return {
        blue: blueTeam,
        red: redTeam
    };
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

    const teams = determineTeamsFromKillmails(killmails);
    const fullBattleObject = await compileFullBattleData(killmails, [systemId], startTime, endTime, undefined, teams);

    return fullBattleObject;
}
