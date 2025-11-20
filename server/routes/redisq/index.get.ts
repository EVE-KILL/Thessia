import prisma from "~/lib/prisma";

/**
 * RedisQ-compatible endpoint for long-polling killmail delivery
 * Compatible with existing zKillboard RedisQ clients
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
            return { package: null };
        }

        const redis = RedisStorage.getInstance();
        const positionKey = `redisq:position:${queueID}`;
        const activeKey = `redisq:queue:${queueID}`;

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
            return formatRedisQResponse(nextKillmail);
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
                return await formatRedisQResponse(nextKillmail);
            }
        }

        return { package: null };
    } catch (error) {
        console.error("RedisQ error:", error);
        return { package: null };
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
                victim: true,
                attackers: true,
                items: {
                    include: {
                        child_items: true,
                    },
                },
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
 * Format killmail in RedisQ-compatible format
 * Compatible with zKillboard RedisQ response structure
 */
async function formatRedisQResponse(killmail: any) {
    // Get locationID (async) and calculate values (sync)
    const locationID = await getLocationId(killmail.solar_system_id);
    const droppedValue = calculateDroppedValue(killmail);
    const destroyedValue = calculateDestroyedValue(killmail);

    return {
        package: {
            killID: killmail.killmail_id,
            killmail: {
                killmail_id: killmail.killmail_id,
                killmail_time: killmail.killmail_time,
                solar_system_id: killmail.solar_system_id,
                victim: {
                    ship_type_id: killmail.victim?.ship_type_id || 0,
                    character_id: killmail.victim?.character_id || 0,
                    corporation_id: killmail.victim?.corporation_id || 0,
                    alliance_id: killmail.victim?.alliance_id || 0,
                    faction_id: killmail.victim?.faction_id || 0,
                    damage_taken: killmail.victim?.damage_taken || 0,
                    position: {
                        x: killmail.victim?.x || 0,
                        y: killmail.victim?.y || 0,
                        z: killmail.victim?.z || 0,
                    },
                },
                attackers: (killmail.attackers || []).map((attacker: any) => ({
                    ship_type_id: attacker.ship_type_id || 0,
                    character_id: attacker.character_id || 0,
                    corporation_id: attacker.corporation_id || 0,
                    alliance_id: attacker.alliance_id || 0,
                    faction_id: attacker.faction_id || 0,
                    damage_done: attacker.damage_done || 0,
                    final_blow: attacker.final_blow || false,
                    security_status: attacker.security_status || 0,
                    weapon_type_id: attacker.weapon_type_id || 0,
                })),
            },
            zkb: {
                locationID,
                hash: killmail.killmail_hash,
                fittedValue: killmail.fitting_value
                    ? Number(killmail.fitting_value)
                    : 0,
                droppedValue,
                destroyedValue,
                totalValue: killmail.total_value
                    ? Number(killmail.total_value)
                    : 0,
                points: 0,
                npc: killmail.is_npc || false,
                solo: killmail.is_solo || false,
                awox: false,
                href:
                    "https://esi.evetech.net/v1/killmails/" +
                    killmail.killmail_id +
                    "/" +
                    killmail.killmail_hash,
                createdAt: killmail.created_at?.toISOString?.() ||
                    new Date().toISOString(),
                labels: [],
            },
        },
    };
}

async function getLocationId(systemId: number): Promise<number> {
    const celestial = await prisma.celestial.findFirst({
        where: { solar_system_id: systemId },
        select: { item_id: true },
    });

    return celestial ? celestial.item_id : 0;
}

/**
 * Calculate the total value of dropped items
 * Recursively processes nested items
 */
function calculateDroppedValue(killmail: any): number {
    function calculateItemDroppedValue(items: any[]): number {
        return items.reduce((total, item) => {
            let itemValue = 0;

            // Add value of dropped quantity
            if (item.quantity_dropped && item.quantity_dropped > 0) {
                itemValue +=
                    Number(item.value || 0) * item.quantity_dropped;
            }

            // Recursively calculate nested items
            if (item.child_items && item.child_items.length > 0) {
                itemValue += calculateItemDroppedValue(item.child_items);
            }

            return total + itemValue;
        }, 0);
    }

    return calculateItemDroppedValue(killmail.items || []);
}

/**
 * Calculate the total value of destroyed items
 * Recursively processes nested items
 */
function calculateDestroyedValue(killmail: any): number {
    function calculateItemDestroyedValue(items: any[]): number {
        return items.reduce((total, item) => {
            let itemValue = 0;

            // Add value of destroyed quantity
            if (item.quantity_destroyed && item.quantity_destroyed > 0) {
                itemValue +=
                    Number(item.value || 0) * item.quantity_destroyed;
            }

            // Recursively calculate nested items
            if (item.child_items && item.child_items.length > 0) {
                itemValue += calculateItemDestroyedValue(item.child_items);
            }

            return total + itemValue;
        }, 0);
    }

    return calculateItemDestroyedValue(killmail.items || []);
}
