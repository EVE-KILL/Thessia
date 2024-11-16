import { Character } from "~/types/ICharacter";
import { ESIKillmail, ESIVictim } from "~/types/IESIKillmail";
import { Killmail, Victim } from "~/types/IKillmail";
import { InvGroups } from "~/types/InvGroup";
import { InvTypes } from "~/types/InvType";

import { getCharacter } from "./ESIData";



async function parseKillmail(killmail: ESIKillmail): Killmail {
    let processedKillmail: Killmail = {} as Killmail;

    processedKillmail['victim'] = await processVictim(killmail.victim);

    return processedKillmail;
}

async function processVictim(victim: ESIVictim ): Promise<Victim> {
    let ship: InvTypes | null = await InvTypes.findOne({ type_id: victim.ship_type_id });
    if (!ship) {
        throw new Error(`Type not found for type_id: ${victim.ship_type_id}`);
    }
    let shipGroup: InvGroups | null = await InvGroups.findOne({ group_id: ship.group_id });
    if (!shipGroup) {
        throw new Error(`Group not found for group_id: ${ship.group_id}`);
    }
    let character: Character = await getCharacter(victim.character_id);
    let corporation: Corporation = await getCorporation(victim.corporation_id);
    if (victim.alliance_id > 0) {
        let alliance: Alliance = await getAlliance(victim.alliance_id);
    }
    if (victim.faction_id > 0) {
        let faction: Faction = await getFaction(victim.faction_id);
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
        corporation_name: corporation.corporation_name,
        alliance_id: victim?.alliance_id || 0,
        alliance_name: alliance?.alliance_name || '',
        faction_id: victim?.faction_id || 0,
        faction_name: faction?.faction_name || ''
    }
}


export default parseKillmail;
