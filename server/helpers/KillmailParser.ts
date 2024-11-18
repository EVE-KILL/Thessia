import { ESIAttacker, ESIKillmail, ESIVictim, ESIVictimItem } from "~/types/IESIKillmail";
import { Attacker, Item, Killmail, Victim } from "~/types/IKillmail";

import { getCharacter, getCorporation, getAlliance, getFaction } from "./ESIData";
import { getPrice } from "./Prices";
import { InvType } from "~/types/InvType";
import { InvGroup } from "~/types/InvGroup";

async function parseKillmail(killmail: ESIKillmail): Promise<Killmail> {
    const top = await generateTop(killmail);
    const victim = await processVictim(killmail.victim);
    const attackers = await processAttackers(killmail.attackers);
    const items = await processItems(killmail.victim.items, new Date(killmail.killmail_time));

    return {
        ...top,
        victim,
        attackers,
        items,
    };
}

async function calculateKillValue(killmail: ESIKillmail): Promise<{ item_value: number; ship_value: number; total_value: number }> {
    const shipTypeId = Number(killmail.victim.ship_type_id);
    const shipValue = await getPrice(shipTypeId, new Date(killmail.killmail_time));
    let itemValue = 0;

    for (const item of killmail.victim.items) {
        if (item.items) {
            for (const cargoItem of item.items) {
                itemValue += await getItemValue(cargoItem, new Date(killmail.killmail_time), true);
            }
        }
        itemValue += await getItemValue(item, new Date(killmail.killmail_time));
    }

    return {
        item_value: itemValue,
        ship_value: shipValue,
        total_value: itemValue + shipValue,
    };
}

async function getItemValue(item: ESIVictimItem, killTime: Date, isCargo: boolean = false): Promise<number> {
    const typeId = Number(item.item_type_id);
    const flag = item.flag;

    const id = await InvTypes.findOne({ type_id: typeId });
    const itemName = id?.type_name || `Type ID ${typeId}`;

    let price = 0;

    if (typeId === 33329 && flag === 89) {
        price = 0.01;
    } else {
        price = await getPrice(typeId, killTime);
    }

    if (isCargo && itemName.includes("Blueprint")) {
        item.singleton = 2;
    }

    if (item.singleton === 2) {
        price /= 100;
    }

    const dropped = Number(item.quantity_dropped || 0);
    const destroyed = Number(item.quantity_destroyed || 0);

    return price * (dropped + destroyed);
}

async function generateTop(killmail: ESIKillmail, warId: number = 0): Promise<Killmail> {
    const solarSystem = await SolarSystems.findOne({ system_id: killmail.solar_system_id });
    const region = solarSystem ? await Regions.findOne({ region_id: solarSystem.region_id }) : null;
    const killValue = await calculateKillValue(killmail);

    const x = killmail.victim?.position?.x || 0;
    const y = killmail.victim?.position?.y || 0;
    const z = killmail.victim?.position?.z || 0;

    return {
        killmail_id: killmail.killmail_id,
        killmail_hash: killmail.killmail_hash,
        kill_time: new Date(killmail.killmail_time),
        system_id: killmail.solar_system_id,
        system_name: solarSystem?.system_name || "",
        system_security: solarSystem?.security || 0,
        region_id: solarSystem?.region_id || 0,
        region_name: region?.region_name || "",
        near: await getNear(Number(x), Number(y), Number(z), Number(killmail.solar_system_id)),
        x,
        y,
        z,
        ship_value: killValue.ship_value,
        fitting_value: killValue.item_value,
        total_value: killValue.total_value,
        is_npc: await isNPC(killmail),
        is_solo: await isSolo(killmail),
        war_id: warId,
    };
}

async function processVictim(victim: ESIVictim): Promise<Victim> {
    const ship = await InvTypes.findOne({ type_id: Number(victim.ship_type_id) });
    if (!ship) throw new Error(`Type not found for type_id: ${victim.ship_type_id}`);

    const shipGroup = await InvGroups.findOne({ group_id: ship.group_id });
    if (!shipGroup) throw new Error(`Group not found for group_id: ${ship.group_id}`);

    const character = victim.character_id ? await getCharacter(victim.character_id) : null;
    const corporation = await getCorporation(victim.corporation_id);
    const alliance = victim.alliance_id ? await getAlliance(Number(victim.alliance_id)) : null;
    const faction = victim.faction_id ? await getFaction(Number(victim.faction_id)) : null;

    return {
        ship_id: victim.ship_type_id,
        ship_name: ship.type_name,
        ship_group_id: shipGroup.group_id,
        ship_group_name: shipGroup.group_name,
        damage_taken: victim.damage_taken,
        character_id: victim.character_id,
        character_name: character?.name || ship.type_name,
        corporation_id: victim.corporation_id,
        corporation_name: corporation.name,
        alliance_id: victim.alliance_id || 0,
        alliance_name: alliance?.name || "",
        faction_id: victim.faction_id || 0,
        faction_name: faction?.name || "",
    };
}

async function getNear(x: number, y: number, z: number, solarSystemId: number): Promise<string> {
    if (x === 0 && y === 0 && z === 0) {
        return "";
    }

    const distance = 1000 * 3.086e16;

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
                distance: {
                    $sqrt: {
                        $add: [
                            { $pow: [{ $subtract: ["$x", x] }, 2] },
                            { $pow: [{ $subtract: ["$y", y] }, 2] },
                            { $pow: [{ $subtract: ["$z", z] }, 2] },
                        ],
                    },
                },
            },
        },
        { $sort: { distance: 1 } },
        { $limit: 1 },
    ]);

    return celestials?.[0]?.item_name || "";
}

async function isNPC(killmail: ESIKillmail): Promise<boolean> {
    const attackerCount = killmail.attackers.length;
    // If the ship_type_id of the attacker is in a group, that is in the category_id 11, then it's a safe bet it's an NPC
    const npcCount = killmail.attackers.filter(
        async (attacker) => {
            let ship: InvType | null = attacker.ship_type_id ? await InvTypes.findOne({ type_id: attacker.ship_type_id }) : null;
            let shipGroup: InvGroup | null = ship ? await InvGroups.findOne({ group_id: ship.group_id }) : null;

            return shipGroup?.category_id === 11;
        }
    ).length;

    return attackerCount > 0 && npcCount > 0 && attackerCount / npcCount === 1;
}

async function isSolo(killmail: ESIKillmail): Promise<boolean> {
    const attackerCount = killmail.attackers.length;
    if (attackerCount === 1) return true;
    if (attackerCount > 2) return false;

    const npcCount = killmail.attackers.filter(
        (attacker) => attacker.character_id === 0 && Number(attacker.corporation_id) < 1999999 && attacker.corporation_id !== 1000125
    ).length;

    return npcCount > 0 && 2 / npcCount === 2;
}

async function processAttackers(attackers: ESIAttacker[]): Promise<Attacker[]> {
    const processedAttackers: Attacker[] = [];

    for (const attacker of attackers) {
        const ship = attacker.ship_type_id ? await InvTypes.findOne({ type_id: attacker.ship_type_id }) : attacker.weapon_type_id ? await InvTypes.findOne({ type_id: attacker.weapon_type_id }) : null;
        const weapon = attacker.weapon_type_id ? await InvTypes.findOne({ type_id: attacker.weapon_type_id }) : await InvTypes.findOne({ type_id: attacker.ship_type_id });

        if (!ship) throw new Error(`Type not found for type_id: ${attacker.ship_type_id}`);
        if (!weapon) throw new Error(`Type not found for type_id: ${attacker.weapon_type_id}`);

        const shipGroup = await InvGroups.findOne({ group_id: ship.group_id });
        if (!shipGroup) throw new Error(`Group not found for group_id: ${ship.group_id}`);

        const character = attacker.character_id ? await getCharacter(attacker.character_id): null;
        const corporation = attacker.corporation_id ? await getCorporation(attacker.corporation_id): null;
        const alliance = attacker.alliance_id ? await getAlliance(Number(attacker.alliance_id)) : null;
        const faction = attacker.faction_id ? await getFaction(Number(attacker.faction_id)) : null;

        processedAttackers.push({
            ship_id: attacker.ship_type_id || attacker.weapon_type_id || 0,
            ship_name: ship.type_name || weapon.type_name || "",
            ship_group_id: shipGroup.group_id || 0,
            ship_group_name: shipGroup.group_name || "",
            character_id: attacker.character_id || 0,
            character_name: character?.name || ship.type_name || weapon.type_name,
            corporation_id: attacker.corporation_id || 0,
            corporation_name: corporation?.name || "",
            alliance_id: attacker.alliance_id || 0,
            alliance_name: alliance?.name || "",
            faction_id: attacker.faction_id || 0,
            faction_name: faction?.name || "",
            security_status: attacker.security_status,
            damage_done: attacker.damage_done,
            final_blow: attacker.final_blow,
            weapon_type_id: attacker.weapon_type_id || 0,
            weapon_type_name: weapon.type_name || "",
        });
    }

    return processedAttackers;
}

async function processItems(items: ESIVictimItem[], killmail_date: Date): Promise<Item[]> {
    const processedItems: Item[] = [];

    for (const item of items) {
        const type = await InvTypes.findOne({ type_id: Number(item.item_type_id) });
        if (!type) throw new Error(`Type not found for type_id: ${item.item_type_id}`);

        const group = await InvGroups.findOne({ group_id: type.group_id });
        if (!group) throw new Error(`Group not found for group_id: ${type.group_id}`);

        const nestedItems = item.items ? await processItems(item.items, killmail_date) : [];

        let innerItem = {
            type_id: item.item_type_id,
            type_name: type.type_name || "",
            group_id: type.group_id,
            group_name: group.group_name || "",
            category_id: group.category_id,
            flag: item.flag,
            qty_dropped: Number(item.quantity_dropped || 0),
            qty_destroyed: Number(item.quantity_destroyed || 0),
            singleton: item.singleton,
            value: await getPrice(Number(item.item_type_id), killmail_date)
        };

        if (nestedItems.length > 0) {
            innerItem.items = nestedItems;
        }

        processedItems.push(innerItem);
    }

    return processedItems;
}

export { parseKillmail };
