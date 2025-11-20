import prisma from "~/lib/prisma";

/**
 * Full killmail stream endpoint - returns complete killmail data
 * Similar to WebSocket functionality but via HTTP long-polling
 *
 * Query parameters:
 * - queueID: Required. Unique identifier for the client
 * - ttw: Optional. Time to wait in seconds (1-10, default 10)
 */
export default defineEventHandler(async (event) => {
    try {
        const query = getQuery(event);
        const queueID = ((query.queueID as string) || "").trim();
        const ttw = Math.min(
            10,
            Math.max(1, parseInt((query.ttw as string) || "10"))
        );

        // queueID is required
        if (!queueID || queueID.length === 0) {
            return { killmail: null };
        }

        const redis = RedisStorage.getInstance();
        const positionKey = `stream:position:${queueID}`;
        const activeKey = `stream:queue:${queueID}`;

        // Mark client as active (expires in 3 hours)
        await redis.set(activeKey, "active", 10800);

        // Get client's last position (killmail_id as string)
        const lastPosition = await redis.get(positionKey);
        const lastKillmailId = lastPosition ? Number(lastPosition) : null;

        // Try to get the next killmail immediately
        let nextKillmail = await getNextKillmail(lastKillmailId);

        if (nextKillmail) {
            // Update client position
            await redis.set(positionKey, `${nextKillmail.killmail_id}`);
            return await formatStreamResponse(nextKillmail);
        }

        // No killmail available, wait for new ones
        const startTime = Date.now();
        const pollInterval = 500; // Poll every 500ms
        const maxWaitTime = ttw * 1000;

        while (Date.now() - startTime < maxWaitTime) {
            await new Promise((resolve) => setTimeout(resolve, pollInterval));

            nextKillmail = await getNextKillmail(lastKillmailId);
            if (nextKillmail) {
                await redis.set(positionKey, `${nextKillmail.killmail_id}`);
                return await formatStreamResponse(nextKillmail);
            }
        }

        // Timeout reached, return null killmail
        return { killmail: null };
    } catch (error) {
        console.error("Killmail stream error:", error);
        return { killmail: null };
    }
});

/**
 * Get the next killmail after the client's current position
 * Different from export API - we want NEWER killmails, not older ones
 */
async function getNextKillmail(
    afterKillmailId: number | null
): Promise<any | null> {
    try {
        const killmail = await prisma.killmail.findFirst({
            where: afterKillmailId
                ? { killmail_id: { gt: afterKillmailId } }
                : undefined,
            include: {
                victim: {
                    include: {
                        ship_type: { select: { name: true, group_id: true } },
                        ship_group: { select: { group_name: true } },
                        character: { select: { name: true } },
                        corporation: { select: { name: true } },
                        alliance: { select: { name: true } },
                        faction: { select: { name: true } },
                    },
                },
                attackers: {
                    include: {
                        ship_type: { select: { name: true, group_id: true } },
                        ship_group: { select: { group_name: true } },
                        weapon_type: { select: { name: true } },
                        character: { select: { name: true } },
                        corporation: { select: { name: true } },
                        alliance: { select: { name: true } },
                        faction: { select: { name: true } },
                    },
                },
                items: {
                    where: { parent_item_id: null },
                    include: {
                        item_type: { select: { name: true, group_id: true } },
                        group: { select: { group_name: true } },
                        child_items: {
                            include: {
                                item_type: {
                                    select: { name: true, group_id: true },
                                },
                                group: { select: { group_name: true } },
                            },
                        },
                    },
                },
                solar_system: {
                    select: {
                        system_name: true,
                        security: true,
                        constellation_id: true,
                        region_id: true,
                        constellation: {
                            select: { constellation_name: true, region_id: true },
                        },
                        region: { select: { region_name: true } },
                    },
                },
                constellation: { select: { constellation_name: true } },
                region: { select: { region_name: true } },
            },
            orderBy: {
                killmail_id: afterKillmailId ? "asc" : "desc",
            },
        });

        return killmail;
    } catch (error) {
        console.error("Error fetching next killmail:", error);
        return null;
    }
}

/**
 * Format killmail in full stream format
 * Returns the complete killmail data structure including items
 */
function formatStreamResponse(killmail: any) {
    const systemName =
        killmail.solar_system?.system_name || killmail.solar_system_id;
    const constellationId =
        killmail.constellation_id ||
        killmail.solar_system?.constellation_id ||
        null;
    const regionId =
        killmail.region_id || killmail.solar_system?.region_id || null;

    const mapItem = (item: any): any => ({
        type_id: item.item_type_id,
        name: item.item_type?.name || {},
        group_id: item.group_id || item.item_type?.group_id || 0,
        group_name: item.group?.group_name || {},
        category_id: item.category_id || 0,
        flag: item.flag,
        qty_dropped: item.quantity_dropped || 0,
        qty_destroyed: item.quantity_destroyed || 0,
        singleton: item.singleton || 0,
        value: item.value ? Number(item.value) : 0,
        items: item.child_items ? item.child_items.map(mapItem) : [],
    });

    return {
        killmail: {
            killmail_id: killmail.killmail_id,
            killmail_hash: killmail.killmail_hash,
            kill_time: killmail.killmail_time,
            kill_time_str: killmail.killmail_time.toISOString(),
            system_id: killmail.solar_system_id,
            system_name: systemName,
            system_security: killmail.solar_system?.security || 0,
            constellation_id: constellationId,
            constellation_name:
                killmail.constellation?.constellation_name ||
                killmail.solar_system?.constellation?.constellation_name ||
                "",
            region_id: regionId,
            region_name:
                killmail.region?.region_name ||
                killmail.solar_system?.region?.region_name ||
                "",
            total_value: killmail.total_value
                ? Number(killmail.total_value)
                : 0,
            ship_value: killmail.ship_value ? Number(killmail.ship_value) : 0,
            fitting_value: killmail.fitting_value
                ? Number(killmail.fitting_value)
                : 0,
            is_npc: killmail.is_npc,
            is_solo: killmail.is_solo,
            war_id: killmail.war_id || 0,
            near: killmail.near || "",
            dna: killmail.dna || "",
            x: killmail.victim?.x || 0,
            y: killmail.victim?.y || 0,
            z: killmail.victim?.z || 0,
            victim: {
                ship_id: killmail.victim?.ship_type_id || 0,
                ship_name: killmail.victim?.ship_type?.name || {},
                ship_group_id: killmail.victim?.ship_group_id || 0,
                ship_group_name:
                    killmail.victim?.ship_group?.group_name || {},
                character_id: killmail.victim?.character_id || 0,
                character_name: killmail.victim?.character?.name || "",
                corporation_id: killmail.victim?.corporation_id || 0,
                corporation_name: killmail.victim?.corporation?.name || "",
                alliance_id: killmail.victim?.alliance_id || 0,
                alliance_name: killmail.victim?.alliance?.name || "",
                faction_id: killmail.victim?.faction_id || 0,
                faction_name: killmail.victim?.faction?.name || "",
                damage_taken: killmail.victim?.damage_taken || 0,
            },
            attackers: (killmail.attackers || []).map((attacker: any) => ({
                ship_id: attacker.ship_type_id || 0,
                ship_name: attacker.ship_type?.name || {},
                ship_group_id: attacker.ship_group_id || 0,
                ship_group_name: attacker.ship_group?.group_name || {},
                character_id: attacker.character_id || 0,
                character_name: attacker.character?.name || "",
                corporation_id: attacker.corporation_id || 0,
                corporation_name: attacker.corporation?.name || "",
                alliance_id: attacker.alliance_id || 0,
                alliance_name: attacker.alliance?.name || "",
                faction_id: attacker.faction_id || 0,
                faction_name: attacker.faction?.name || "",
                damage_done: attacker.damage_done || 0,
                final_blow: attacker.final_blow || false,
                security_status: attacker.security_status || 0,
                weapon_type_id: attacker.weapon_type_id || 0,
                weapon_type_name: attacker.weapon_type?.name || {},
            })),
            items: (killmail.items || []).map(mapItem),
        },
    };
}
