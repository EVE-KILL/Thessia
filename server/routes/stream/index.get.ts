import { ObjectId } from "mongodb";
import { RedisStorage } from "~/server/helpers/Storage";
import { Killmails, type IKillmailDocument } from "~/server/models/Killmails";

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
        } else {
            // New client, start fresh (will get newest killmail)
            lastObjectId = null;
        }

        // Try to get the next killmail immediately
        let nextKillmail = await getNextKillmail(lastObjectId);

        if (nextKillmail) {
            // Update client position
            await redis.set(
                positionKey,
                (nextKillmail._id as ObjectId).toString()
            );
            return formatStreamResponse(nextKillmail);
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
                return formatStreamResponse(nextKillmail);
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
    afterObjectId: ObjectId | null
): Promise<IKillmailDocument | null> {
    try {
        // Build filter - if no position, get the newest killmail as starting point
        // If we have a position, get killmails NEWER than that position (using $gt)
        const filter: any = {};
        if (afterObjectId) {
            filter._id = { $gt: afterObjectId };
        }

        const killmail = await Killmails.findOne(
            filter
            // Include all fields including items for full killmail stream
        ).sort({ _id: afterObjectId ? 1 : -1 }); // If no position, get newest. If position exists, get oldest of the newer ones.

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
function formatStreamResponse(killmail: IKillmailDocument) {
    return {
        killmail: {
            killmail_id: killmail.killmail_id,
            killmail_hash: killmail.killmail_hash,
            kill_time: killmail.kill_time,
            kill_time_str: killmail.kill_time_str,
            system_id: killmail.system_id,
            system_name: killmail.system_name,
            system_security: killmail.system_security,
            constellation_id: killmail.constellation_id,
            constellation_name: killmail.constellation_name,
            region_id: killmail.region_id,
            region_name: killmail.region_name,
            total_value: killmail.total_value,
            ship_value: killmail.ship_value,
            fitting_value: killmail.fitting_value,
            is_npc: killmail.is_npc,
            is_solo: killmail.is_solo,
            war_id: killmail.war_id || 0,
            near: killmail.near || "",
            dna: killmail.dna || "",
            x: killmail.x || 0,
            y: killmail.y || 0,
            z: killmail.z || 0,
            victim: {
                ship_id: killmail.victim.ship_id,
                ship_name: killmail.victim.ship_name,
                ship_group_id: killmail.victim.ship_group_id,
                ship_group_name: killmail.victim.ship_group_name,
                character_id: killmail.victim.character_id || 0,
                character_name: killmail.victim.character_name || "",
                corporation_id: killmail.victim.corporation_id || 0,
                corporation_name: killmail.victim.corporation_name || "",
                alliance_id: killmail.victim.alliance_id || 0,
                alliance_name: killmail.victim.alliance_name || "",
                faction_id: killmail.victim.faction_id || 0,
                faction_name: killmail.victim.faction_name || "",
                damage_taken: killmail.victim.damage_taken || 0,
            },
            attackers: killmail.attackers.map((attacker: any) => ({
                ship_id: attacker.ship_id || 0,
                ship_name: attacker.ship_name || {},
                ship_group_id: attacker.ship_group_id || 0,
                ship_group_name: attacker.ship_group_name || {},
                character_id: attacker.character_id || 0,
                character_name: attacker.character_name || "",
                corporation_id: attacker.corporation_id || 0,
                corporation_name: attacker.corporation_name || "",
                alliance_id: attacker.alliance_id || 0,
                alliance_name: attacker.alliance_name || "",
                faction_id: attacker.faction_id || 0,
                faction_name: attacker.faction_name || "",
                damage_done: attacker.damage_done || 0,
                final_blow: attacker.final_blow || false,
                security_status: attacker.security_status || 0,
                weapon_type_id: attacker.weapon_type_id || 0,
                weapon_type_name: attacker.weapon_type_name || {},
            })),
            items: killmail.items || [], // Include full items array
        },
    };
}
