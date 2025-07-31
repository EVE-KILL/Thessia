import { ObjectId } from "mongodb";
import { RedisStorage } from "~/server/helpers/Storage";
import { Celestials } from "~/server/models/Celestials";
import { Killmails, type IKillmailDocument } from "~/server/models/Killmails";

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

        // Get client's last position (ObjectId as string)
        const lastPosition = await redis.get(positionKey);
        let lastObjectId: ObjectId | null = null;

        if (lastPosition) {
            try {
                lastObjectId = new ObjectId(lastPosition);
            } catch {
                // Invalid ObjectId, start fresh
                lastObjectId = null;
            }
        }

        // Try to get the next killmail immediately
        let nextKillmail = await getNextKillmail(lastObjectId);
        if (nextKillmail) {
            // Update client position
            await redis.set(
                positionKey,
                (nextKillmail._id as ObjectId).toString()
            );
            return formatRedisQResponse(nextKillmail);
        }

        // No killmail available, wait for new ones
        const startTime = Date.now();
        const pollInterval = 500; // Poll every 500ms
        const maxWaitTime = ttw * 1000;

        while (Date.now() - startTime < maxWaitTime) {
            await new Promise((resolve) => setTimeout(resolve, pollInterval));

            nextKillmail = await getNextKillmail(lastObjectId);
            if (nextKillmail) {
                await redis.set(
                    positionKey,
                    (nextKillmail._id as ObjectId).toString()
                );
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
    afterObjectId: ObjectId | null
): Promise<IKillmailDocument | null> {
    try {
        // Build filter - if no position, get the newest killmail as starting point
        // If we have a position, get killmails NEWER than that position (using $gt)
        const filter: any = {};
        if (afterObjectId) {
            filter._id = { $gt: afterObjectId };
        }

        const killmail = await Killmails.findOne(filter, {
            // Include items since we need them for value calculations
            // Only exclude the most nested item details if needed for performance
        }).sort({ _id: afterObjectId ? 1 : -1 }); // If no position, get newest. If position exists, get oldest of the newer ones.

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
async function formatRedisQResponse(killmail: IKillmailDocument) {
    // Get locationID (async) and calculate values (sync)
    const locationID = await getLocationId(killmail.system_id);
    const droppedValue = calculateDroppedValue(killmail);
    const destroyedValue = calculateDestroyedValue(killmail);

    return {
        package: {
            killID: killmail.killmail_id,
            killmail: {
                killmail_id: killmail.killmail_id,
                killmail_time: killmail.kill_time,
                solar_system_id: killmail.system_id,
                victim: {
                    ship_type_id: killmail.victim.ship_id,
                    character_id: killmail.victim.character_id || 0,
                    corporation_id: killmail.victim.corporation_id || 0,
                    alliance_id: killmail.victim.alliance_id || 0,
                    faction_id: killmail.victim.faction_id || 0,
                    damage_taken: killmail.victim.damage_taken || 0,
                    position: {
                        x: killmail.x || 0,
                        y: killmail.y || 0,
                        z: killmail.z || 0,
                    },
                },
                attackers: killmail.attackers.map((attacker: any) => ({
                    ship_type_id: attacker.ship_id || 0,
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
                fittedValue: killmail.fitting_value || 0,
                droppedValue,
                destroyedValue,
                totalValue: killmail.total_value || 0,
                points: 0,
                npc: killmail.is_npc || false,
                solo: killmail.is_solo || false,
                awox: false,
                href:
                    "https://esi.evetech.net/v1/killmails/" +
                    killmail.killmail_id +
                    "/" +
                    killmail.killmail_hash,
                createdAt:
                    killmail.createdAt?.toISOString() ||
                    new Date().toISOString(),
                labels: [],
            },
        },
    };
}

async function getLocationId(systemId: number): Promise<number> {
    const celestial = await Celestials.findOne(
        { solar_system_id: systemId },
        { item_id: 1 }
    ).lean();

    return celestial ? celestial.item_id : 0;
}

/**
 * Calculate the total value of dropped items
 * Recursively processes nested items
 */
function calculateDroppedValue(killmail: IKillmailDocument): number {
    function calculateItemDroppedValue(items: any[]): number {
        return items.reduce((total, item) => {
            let itemValue = 0;

            // Add value of dropped quantity
            if (item.qty_dropped && item.qty_dropped > 0) {
                itemValue += (item.value || 0) * item.qty_dropped;
            }

            // Recursively calculate nested items
            if (item.items && item.items.length > 0) {
                itemValue += calculateItemDroppedValue(item.items);
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
function calculateDestroyedValue(killmail: IKillmailDocument): number {
    function calculateItemDestroyedValue(items: any[]): number {
        return items.reduce((total, item) => {
            let itemValue = 0;

            // Add value of destroyed quantity
            if (item.qty_destroyed && item.qty_destroyed > 0) {
                itemValue += (item.value || 0) * item.qty_destroyed;
            }

            // Recursively calculate nested items
            if (item.items && item.items.length > 0) {
                itemValue += calculateItemDestroyedValue(item.items);
            }

            return total + itemValue;
        }, 0);
    }

    return calculateItemDestroyedValue(killmail.items || []);
}
