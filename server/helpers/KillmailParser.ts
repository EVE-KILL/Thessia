import prisma from "~/lib/prisma";
import { updateStatsOnKillmailProcessing } from "./Stats";
import type {
    IESIAttacker,
    IESIKillmail,
    IESIVictim,
    IESIVictimItem,
} from "../interfaces/IESIKillmail";
import type { IKillmail } from "../interfaces/IKillmail";
import type { ITranslation } from "../interfaces/ITranslation";
import type { IItem, IVictim, IAttacker } from "../interfaces/IKillmail";
import {
    AllianceService,
    CharacterService,
    ConstellationService,
    CorporationService,
    FactionService,
    PriceService,
    RegionService,
    SystemService,
    TypeService,
} from "~/server/services";
import { queueAchievementProcessing } from "../queue/Achievement";

// Simple helper wrappers around Prisma services (no caching layer)
async function getInvType(typeId: number) {
    return await TypeService.findById(typeId);
}

async function getInvGroup(groupId: number) {
    return await prisma.invGroup.findUnique({ where: { group_id: groupId } });
}

async function getCharacter(characterId: number) {
    return await CharacterService.findById(characterId);
}

async function getCorporation(corporationId: number) {
    return await CorporationService.findById(corporationId);
}

async function getAlliance(allianceId: number) {
    return await AllianceService.findById(allianceId);
}

async function getFaction(factionId: number) {
    return await FactionService.findById(factionId);
}

async function getSolarSystem(systemId: number) {
    return await SystemService.findById(systemId);
}

async function getConstellation(constellationId?: number | null) {
    if (!constellationId) return null;
    return await ConstellationService.findById(constellationId);
}

async function getRegion(regionId?: number | null) {
    if (!regionId) return null;
    return await RegionService.findById(regionId);
}

async function getPriceForType(typeId: number, at: Date) {
    const custom = await prisma.customPrice.findFirst({
        where: { type_id: typeId, date: { lte: at } },
        orderBy: { date: "desc" },
        select: { price: true },
    });

    if (custom?.price !== null && custom?.price !== undefined) {
        return Number(custom.price);
    }

    return await PriceService.getLatestPriceBefore(typeId, at);
}

// Parse ESI killmail into normalized structure (still used by queue)
async function parseKillmail(
    killmail: IESIKillmail,
    warId = 0
): Promise<Partial<IKillmail>> {
    const [top, victim, attackers, itemsData] = await Promise.all([
        generateTop(killmail, warId),
        processVictim(killmail.victim),
        processAttackers(killmail.attackers),
        processItems(killmail.victim.items, new Date(killmail.killmail_time)),
        updateLastActive(killmail),
    ]);

    const processedKillmail = {
        ...top,
        victim,
        attackers,
        items: itemsData,
    };

    if (
        processedKillmail.killmail_id &&
        processedKillmail.kill_time &&
        processedKillmail.victim &&
        processedKillmail.attackers &&
        processedKillmail.total_value !== undefined
    ) {
        await updateStatsOnKillmailProcessing(processedKillmail as IKillmail);
        await handleKillmailAchievementUpdates(
            processedKillmail.victim.character_id,
            processedKillmail.attackers
                .map((a: any) => a.character_id)
                .filter((id: any) => id > 0)
        );
    }

    return processedKillmail;
}

async function updateLastActive(killmail: IESIKillmail): Promise<void> {
    const killTime = new Date(killmail.killmail_time);
    const actorIds = [
        ...killmail.attackers
            .map((a) => a.character_id || 0)
            .filter((id) => id > 0),
        killmail.victim.character_id || 0,
    ].filter((id) => id > 0);

    if (actorIds.length === 0) return;

    await prisma.character.updateMany({
        where: {
            character_id: { in: actorIds },
            OR: [{ last_active: null }, { last_active: { lt: killTime } }],
        },
        data: { last_active: killTime },
    });
}

async function calculateKillValue(
    killmail: IESIKillmail
): Promise<{ item_value: number; ship_value: number; total_value: number }> {
    const shipTypeId = Number(killmail.victim.ship_type_id);
    const ship = await getInvType(shipTypeId);
    const shipGroup = ship?.group_id
        ? await getInvGroup(ship.group_id)
        : null;

    let shipValue = 0;
    if (shipGroup && (shipGroup.group_id === 659 || shipGroup.group_id === 30)) {
        const custom = await prisma.customPrice.findFirst({
            where: { type_id: shipTypeId },
            orderBy: { date: "desc" },
            select: { price: true },
        });
        shipValue = custom?.price ? Number(custom.price) : Number(ship?.base_price || 0);
    } else {
        shipValue = await getPriceForType(shipTypeId, new Date(killmail.killmail_time));
    }

    let itemValue = 0;
    for (const item of killmail.victim.items) {
        if (item.items) {
            for (const child of item.items) {
                itemValue += await getItemValue(
                    child,
                    new Date(killmail.killmail_time),
                    true
                );
            }
        }
        itemValue += await getItemValue(
            item,
            new Date(killmail.killmail_time)
        );
    }

    return {
        item_value: itemValue,
        ship_value: shipValue,
        total_value: itemValue + shipValue,
    };
}

async function getItemValue(
    item: IESIVictimItem,
    killTime: Date,
    isCargo = false
): Promise<number> {
    const typeId = Number(item.item_type_id);
    const flag = item.flag;

    const invType = await getInvType(typeId);
    const itemName: ITranslation = invType?.name || { en: `Type ID ${typeId}` };

    let price = 0;

    if (typeId === 33329 && flag === 89) {
        price = 0.01;
    } else {
        price = await getPriceForType(typeId, killTime);
    }

    if (isCargo && itemName.en.includes("Blueprint")) {
        item.singleton = 2;
    }

    if (item.singleton === 2) {
        price /= 100;
    }

    const dropped = Number(item.quantity_dropped || 0);
    const destroyed = Number(item.quantity_destroyed || 0);

    return price * (dropped + destroyed);
}

async function generateTop(
    killmail: IESIKillmail,
    warId = 0
): Promise<Partial<IKillmail>> {
    const [solarSystem, killValue] = await Promise.all([
        getSolarSystem(killmail.solar_system_id),
        calculateKillValue(killmail),
    ]);

    let constellation = null;
    let region = null;
    if (solarSystem) {
        [constellation, region] = await Promise.all([
            solarSystem.constellation_id
                ? getConstellation(solarSystem.constellation_id)
                : null,
            solarSystem.region_id
                ? getRegion(solarSystem.region_id)
                : null,
        ]);
    }

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
        constellation_id: solarSystem?.constellation_id || 0,
        constellation_name: constellation?.constellation_name || "",
        region_id: solarSystem?.region_id || 0,
        region_name: (region as any)?.region_name || { en: "" },
        near: await getNear(
            Number(x),
            Number(y),
            Number(z),
            Number(killmail.solar_system_id)
        ),
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

async function processVictim(victim: IESIVictim): Promise<IVictim> {
    const ship = (await getInvType(Number(victim.ship_type_id))) || null;
    const shipGroup = ship?.group_id
        ? await getInvGroup(ship.group_id)
        : null;

    const [character, corporation, alliance, faction] = await Promise.all([
        victim.character_id
            ? getCharacter(victim.character_id)
            : Promise.resolve(null),
        getCorporation(victim.corporation_id),
        victim.alliance_id
            ? getAlliance(Number(victim.alliance_id))
            : Promise.resolve(null),
        victim.faction_id
            ? getFaction(Number(victim.faction_id))
            : Promise.resolve(null),
    ]);

    return {
        ship_id: victim.ship_type_id || 0,
        ship_name: ship?.name || { en: "" },
        ship_group_id: shipGroup?.group_id || 0,
        ship_group_name: shipGroup?.name || { en: "" },
        damage_taken: victim.damage_taken || 0,
        character_id: victim.character_id || 0,
        character_name: character?.name || ship?.name.en || "",
        corporation_id: victim.corporation_id || 0,
        corporation_name: corporation?.name || "",
        alliance_id: victim.alliance_id || 0,
        alliance_name: alliance?.name || "",
        faction_id: victim.faction_id || 0,
        faction_name: faction?.name || "",
    };
}

async function getNear(
    x: number,
    y: number,
    z: number,
    solarSystemId: number
): Promise<string> {
    if (x === 0 && y === 0 && z === 0) {
        return "";
    }

    const celestials =
        await prisma.$queryRaw<{ item_name: string }[]>`
        SELECT item_name
        FROM celestials
        WHERE solar_system_id = ${solarSystemId}
        ORDER BY
            pow(x - ${x}, 2) + pow(y - ${y}, 2) + pow(z - ${z}, 2)
        ASC
        LIMIT 1
    `;

    return celestials?.[0]?.item_name || "";
}

async function isNPC(killmail: IESIKillmail): Promise<boolean> {
    const attackerCount = killmail.attackers.length;

    const npcStatuses = await Promise.all(
        killmail.attackers.map(async (attacker) => {
            if (!attacker.ship_type_id) return false;

            const ship = await getInvType(attacker.ship_type_id);
            if (!ship) return false;

            const shipGroup = ship.group_id
                ? await getInvGroup(ship.group_id)
                : null;
            return shipGroup?.category_id === 11;
        })
    );

    const npcCount = npcStatuses.filter((isNpc) => isNpc).length;
    return attackerCount > 0 && npcCount > 0 && attackerCount === npcCount;
}

async function isSolo(killmail: IESIKillmail): Promise<boolean> {
    const attackerCount = killmail.attackers.length;
    if (attackerCount === 1) return true;
    if (attackerCount > 2) return false;

    const npcCount = killmail.attackers.filter(
        (attacker) =>
            attacker.character_id === 0 &&
            Number(attacker.corporation_id) < 1999999 &&
            attacker.corporation_id !== 1000125
    ).length;

    return npcCount > 0 && 2 / npcCount === 2;
}

async function processAttackers(
    attackers: IESIAttacker[]
): Promise<IAttacker[]> {
    return await Promise.all(
        attackers.map(async (attacker) => {
            const ship = attacker.ship_type_id
                ? await getInvType(attacker.ship_type_id)
                : attacker.weapon_type_id
                ? await getInvType(attacker.weapon_type_id)
                : null;
            const weapon = attacker.weapon_type_id
                ? await getInvType(attacker.weapon_type_id)
                : await getInvType(attacker.ship_type_id);

            const shipGroup = ship?.group_id
                ? await getInvGroup(ship.group_id)
                : null;
            const character = attacker.character_id
                ? await getCharacter(attacker.character_id)
                : null;
            const corporation = attacker.corporation_id
                ? await getCorporation(attacker.corporation_id)
                : null;
            const alliance = attacker.alliance_id
                ? await getAlliance(Number(attacker.alliance_id))
                : null;
            const faction = attacker.faction_id
                ? await getFaction(Number(attacker.faction_id))
                : null;
            return {
                ship_id: attacker.ship_type_id || attacker.weapon_type_id || 0,
                ship_name: ship?.name || weapon?.name || { en: "" },
                ship_group_id: shipGroup?.group_id || 0,
                ship_group_name: shipGroup?.name || { en: "" },
                character_id: attacker.character_id || 0,
                character_name:
                    character?.name || ship?.name.en || weapon?.name.en || "",
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
                weapon_type_name: weapon?.name || { en: "" },
            };
        })
    );
}

async function processItems(
    items: IESIVictimItem[],
    killmail_date: Date
): Promise<IItem[]> {
    return await Promise.all(
        items.map(async (item) => {
            const type =
                (await getInvType(Number(item.item_type_id))) || null;
            const group = type?.group_id
                ? await getInvGroup(type.group_id)
                : null;
            const nestedItems = item.items
                ? await processItems(item.items, killmail_date)
                : [];
            const value = await getPriceForType(
                Number(item.item_type_id),
                killmail_date
            );
            return {
                type_id: item.item_type_id || 0,
                name: type?.name || { en: "" },
                group_id: type?.group_id || 0,
                group_name: group?.name || { en: "" },
                category_id: group?.category_id || 0,
                flag: item.flag || 0,
                qty_dropped: Number(item.quantity_dropped || 0),
                qty_destroyed: Number(item.quantity_destroyed || 0),
                singleton: item.singleton || 0,
                value: value || 0,
                ...(nestedItems.length > 0 && { items: nestedItems }),
            };
        })
    );
}

async function handleCharacterAchievementUpdate(
    characterId: number
): Promise<void> {
    if (!characterId || characterId <= 0) {
        return;
    }

    try {
        const existingRecord = await prisma.characterAchievements.findUnique({
            where: { character_id: characterId },
            select: { id: true },
        });

        if (!existingRecord) {
            await queueAchievementProcessing(characterId, 3);
        } else {
            await prisma.characterAchievements.update({
                where: { character_id: characterId },
                data: { needs_processing: true },
            });
        }
    } catch (error) {
        console.error(
            `Failed to handle achievement update for character ${characterId}:`,
            error
        );
    }
}

async function handleKillmailAchievementUpdates(
    victimCharacterId: number | undefined,
    attackerCharacterIds: number[]
): Promise<void> {
    const characterIds: number[] = [];

    if (victimCharacterId && victimCharacterId > 0) {
        characterIds.push(victimCharacterId);
    }

    for (const attackerId of attackerCharacterIds) {
        if (attackerId && attackerId > 0) {
            characterIds.push(attackerId);
        }
    }

    const uniqueCharacterIds = [...new Set(characterIds)];

    await Promise.all(
        uniqueCharacterIds.map((characterId) =>
            handleCharacterAchievementUpdate(characterId)
        )
    );
}

export { parseKillmail };
