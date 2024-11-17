import { ESIAttacker, ESIKillmail, ESIVictim, ESIVictimItem } from "~/types/IESIKillmail";
import { Attacker, Item, Killmail, Victim } from "~/types/IKillmail";
import { SolarSystem } from "~/types/ISolarSystem";

import { getCharacter, getCorporation, getAlliance, getFaction } from "./ESIData";
import { getPrice } from "./Prices";
import { Region } from "~/types/IRegion";

async function parseKillmail(killmail: ESIKillmail): Promise<Killmail> {
    const [top, victim, attackers, items] = await Promise.all([
        generateTop(killmail),
        processVictim(killmail.victim),
        processAttackers(killmail.attackers),
        processItems(killmail.victim.items, new Date(killmail.killmail_time)),
    ]);

    // Combine results
    const processedKillmail: Killmail = {
        ...top,
        victim,
        attackers,
        items,
    };

    return processedKillmail;
}

async function calculateKillValue(killmail: ESIKillmail): Promise<{ item_value: number; ship_value: number; total_value: number }> {
    const shipTypeId = killmail.victim.ship_type_id;

    const [shipValue, itemValues] = await Promise.all([
        getPrice(shipTypeId, new Date(killmail.killmail_time)),
        Promise.all(
            killmail.victim.items.map(async (item) => {
                if (item.items) {
                    const cargoValue = await Promise.all(
                        item.items.map((cargoItem) => getItemValue(cargoItem, new Date(killmail.killmail_time), true))
                    );
                    return cargoValue.reduce((sum, val) => sum + val, 0);
                }
                return getItemValue(item, new Date(killmail.killmail_time));
            })
        ),
    ]);

    const itemValue = itemValues.reduce((sum, val) => sum + val, 0);

    return {
        item_value: itemValue,
        ship_value: shipValue,
        total_value: itemValue + shipValue,
    };
}

async function getItemValue(item: ESIVictimItem, killTime: Date, isCargo: boolean = false): Promise<number> {
    const typeId = item.item_type_id;
    const flag = item.flag;

    // Fetch type details from database or API
    const id = await InvTypes.findOne({ type_id: typeId });
    const itemName = id?.name || `Type ID ${typeId}`;

    // Default price calculation
    let price = 0;

    // Special case: Golden Pod
    if (typeId === 33329 && flag === 89) {
        price = 0.01;
    } else {
        price = await getPrice(typeId, killTime);
    }

    // Handle blueprints in cargo
    if (isCargo && itemName.includes('Blueprint')) {
        item.singleton = 2;
    }

    // Adjust price for singleton items
    if (item.singleton === 2) {
        price /= 100;
    }

    // Calculate based on dropped and destroyed quantities
    const dropped = item.quantity_dropped || 0;
    const destroyed = item.quantity_destroyed || 0;

    return price * (dropped + destroyed);
}

async function generateTop(killmail: ESIKillmail, warId: Number = 0): Promise<Killmail> {
    let solarSystem: SolarSystem = await SolarSystems.findOne({ system_id: killmail.solar_system_id });
    let region: Region = await Regions.findOne({ region_id: solarSystem.region_id });
    let killValue = await calculateKillValue(killmail);
    let x = killmail.victim.position.x;
    let y = killmail.victim.position.y;
    let z = killmail.victim.position.z;

    return {
        killmail_id: killmail.killmail_id,
        killmail_hash: killmail.killmail_hash,
        kill_time: new Date(killmail.killmail_time),
        system_id: killmail.solar_system_id,
        system_name: solarSystem.system_name,
        system_security: solarSystem.security,
        region_id: solarSystem.region_id,
        region_name: region.region_name,
        near: await getNear(x, y, z, Number(killmail.solar_system_id)),
        x: x,
        y: y,
        z: z,
        ship_value: killValue.ship_value,
        fitting_value: killValue.item_value,
        total_value: killValue.total_value,
        is_npc: await isNPC(killmail),
        is_solo: await isSolo(killmail),
        war_id: 0,
    };
}

async function processVictim(victim: ESIVictim): Promise<Victim> {
    const [ship, character, corporation, alliance, faction] = await Promise.all([
        InvTypes.findOne({ type_id: victim.ship_type_id }),
        getCharacter(victim.character_id),
        getCorporation(victim.corporation_id),
        victim.alliance_id > 0 ? getAlliance(victim.alliance_id) : Promise.resolve(null),
        victim.faction_id > 0 ? getFaction(victim.faction_id) : Promise.resolve(null),
    ]);

    if (!ship) {
        throw new Error(`Type not found for type_id: ${victim.ship_type_id}`);
    }
    const shipGroup = await InvGroups.findOne({ group_id: ship.group_id });

    if (!shipGroup) {
        throw new Error(`Group not found for group_id: ${ship.group_id}`);
    }

    return {
        ship_id: victim.ship_type_id,
        ship_name: ship.type_name,
        ship_group_id: shipGroup.group_id,
        ship_group_name: shipGroup.group_name,
        damage_taken: victim.damage_taken,
        character_id: victim.character_id,
        character_name: character.name,
        corporation_id: victim.corporation_id,
        corporation_name: corporation.name,
        alliance_id: victim.alliance_id || 0,
        alliance_name: alliance?.name || '',
        faction_id: victim.faction_id || 0,
        faction_name: faction?.name || '',
    };
}

async function getNear(x: number, y: number, z: number, solarSystemId: number): Promise<string> {
    // Return an empty string if all coordinates are zero
    if (x === 0 && y === 0 && z === 0) {
        return '';
    }

    // Define distance limit: 1000 AU in meters
    const distance = 1000 * 3.086e16;

    // Query the Celestials collection for objects near the coordinates
    const celestials = await Celestials.aggregate([
        {
            $match: {
                solar_system_id: solarSystemId,
                x: { $gt: x - distance, $lt: x + distance },
                y: { $gt: y - distance, $lt: y + distance },
                z: { $gt: z - distance, $lt: z + distance },
            },
        },
        {
            $project: {
                item_id: 1,
                item_name: 1,
                constellation_id: 1,
                solar_system_id: 1,
                solar_system_name: 1,
                region_id: 1,
                region_name: 1,
                distance: {
                    $sqrt: {
                        $add: [
                            { $pow: [{ $subtract: ['$x', x] }, 2] },
                            { $pow: [{ $subtract: ['$y', y] }, 2] },
                            { $pow: [{ $subtract: ['$z', z] }, 2] },
                        ],
                    },
                },
            },
        },
        { $sort: { distance: 1 } },
        { $limit: 1 },
    ]);

    // Return the closest celestial's item_name or an empty string if none found
    if (!celestials || celestials.length === 0) {
        return '';
    }

    return celestials[0].item_name || '';
}

async function isNPC(killmail: ESIKillmail): Promise<boolean> {
    let npcCount = 0;
    let calc = 0;
    const attackerCount = killmail.attackers.length;

    for (const attacker of killmail.attackers) {
        if (attacker.character_id === 0 && (attacker.corporation_id < 1999999 && attacker.corporation_id !== 1000125)) {
            npcCount++;
        }
    }

    if (attackerCount > 0 && npcCount > 0) {
        calc = attackerCount / npcCount;
    }

    return calc === 1;
}

async function isSolo(killmail: ESIKillmail): Promise<boolean> {
    let npcCount = 0;
    let calc = 0;
    const attackerCount = killmail.attackers.length;

    if (attackerCount > 2) {
        return false; // More than 2 attackers means it's not solo
    } else if (attackerCount === 1) {
        return true; // Only 1 attacker means it's solo
    }

    for (const attacker of killmail.attackers) {
        // Check if the attacker is an NPC
        if (attacker.character_id === 0 && (attacker.corporation_id < 1999999 && attacker.corporation_id !== 1000125)) {
            npcCount++;
        }
    }

    if (npcCount > 0) {
        calc = 2 / npcCount;
    }

    return calc === 2;
}

async function processAttackers(attackers: ESIAttacker[]): Promise<Attacker[]> {
    return Promise.all(
        attackers.map(async (attacker) => {
            const [ship, weapon, character, corporation, alliance, faction] = await Promise.all([
                InvTypes.findOne({ type_id: attacker.ship_type_id }),
                InvTypes.findOne({ type_id: attacker.weapon_type_id }),
                getCharacter(attacker.character_id),
                getCorporation(attacker.corporation_id),
                attacker.alliance_id > 0 ? getAlliance(attacker.alliance_id) : Promise.resolve(null),
                attacker.faction_id > 0 ? getFaction(attacker.faction_id) : Promise.resolve(null),
            ]);

            if (!ship || !weapon) {
                throw new Error(`Type not found for type_id: ${attacker.ship_type_id || attacker.weapon_type_id}`);
            }
            const shipGroup = await InvGroups.findOne({ group_id: ship.group_id });

            if (!shipGroup) {
                throw new Error(`Group not found for group_id: ${ship.group_id}`);
            }

            return {
                ship_id: attacker.ship_type_id,
                ship_name: ship.type_name,
                ship_group_id: shipGroup.group_id,
                ship_group_name: shipGroup.group_name,
                character_id: attacker.character_id,
                character_name: character.name,
                corporation_id: attacker.corporation_id,
                corporation_name: corporation.name,
                alliance_id: attacker.alliance_id || 0,
                alliance_name: alliance?.name || '',
                faction_id: attacker.faction_id || 0,
                faction_name: faction?.name || '',
                security_status: attacker.security_status,
                damage_done: attacker.damage_done,
                final_blow: attacker.final_blow,
                weapon_type_id: attacker.weapon_type_id,
                weapon_type_name: weapon.type_name,
            };
        })
    );
}

async function processItems(items: ESIVictimItem[], killmail_date: Date): Promise<Item[]> {
    return Promise.all(
        items.map(async (item) => {
            const [type, nestedItems] = await Promise.all([
                InvTypes.findOne({ type_id: item.item_type_id }),
                item.items ? processItems(item.items, killmail_date) : Promise.resolve([]),
            ]);

            if (!type) {
                throw new Error(`Type not found for type_id: ${item.item_type_id}`);
            }

            const group = await InvGroups.findOne({ group_id: type.group_id });
            if (!group) {
                throw new Error(`Group not found for group_id: ${type.group_id}`);
            }

            return {
                type_id: item.item_type_id,
                type_name: type.type_name || '',
                group_id: type.group_id,
                group_name: group.group_name || '',
                category_id: group.category_id,
                flag: item.flag,
                qty_dropped: item.quantity_dropped || 0,
                qty_destroyed: item.quantity_destroyed || 0,
                singleton: item.singleton,
                value: await getPrice(item.item_type_id, killmail_date),
                items: nestedItems,
            };
        })
    );
}

export { parseKillmail };
