import { fetchESIKillmail } from "../helpers/ESIData";
import { parseKillmail } from "../helpers/KillmailParser";
import { createQueue } from "../helpers/Queue";
import type { IESIKillmail } from "../interfaces/IESIKillmail";
import type { IKillmail } from "../interfaces/IKillmail";
import { KillmailService } from "../services/KillmailService";

const killmailQueue = createQueue("killmail");

async function addKillmail(
    killmailId: number,
    killmailHash: string,
    warId = 0,
    priority = 1
) {
    await killmailQueue.add(
        "killmail",
        { killmailId: killmailId, killmailHash: killmailHash, warId: warId },
        {
            priority: priority,
            attempts: 10,
            backoff: {
                type: "fixed",
                delay: 5000, // 5 seconds
            },
            removeOnComplete: 1000,
            removeOnFail: 5000,
        }
    );
}

async function processKillmail(
    killmailId: number,
    killmailHash: string,
    warId = 0
): Promise<Partial<IKillmail>> {
    // Check if killmail already exists and is processed
    const existingKillmail = await KillmailService.findById(killmailId);
    if (existingKillmail && existingKillmail.processed) {
        // Return the existing killmail in the expected format
        const fullKillmail = await KillmailService.findByIdWithFull(killmailId);
        if (fullKillmail) {
            // For now, skip returning existing processed killmails
            // TODO: Add method to convert normalized data back to IKillmail format
            // return fullKillmail as Partial<IKillmail>;
        }
    }

    // Fetch ESI killmail data
    const esiKillmail = await fetchESIKillmail(killmailId, killmailHash);

    // Validate the killmail data BEFORE saving to database
    if (
        esiKillmail.error ||
        !esiKillmail.victim ||
        typeof esiKillmail.victim !== "object" ||
        Object.keys(esiKillmail.victim).length === 0 ||
        !esiKillmail.attackers ||
        !Array.isArray(esiKillmail.attackers) ||
        esiKillmail.attackers.length === 0
    ) {
        throw new Error(
            `Error fetching killmail (KillmailID: ${killmailId}): ${
                esiKillmail.error ||
                "Invalid killmail data - missing victim or attackers"
            }`
        );
    }

    try {
        // Create or update the killmail record using the normalized schema
        let killmail = await KillmailService.findById(killmailId);

        if (!killmail) {
            // Create new killmail from ESI data (stores in normalized tables)
            killmail = await KillmailService.createFromESI(
                esiKillmail as IESIKillmail
            );
        }

        // Parse and enrich the killmail data
        const processedKillmail = await parseKillmail(esiKillmail, warId);

        // Extract enrichment data from processed killmail
        const enrichmentData = {
            total_value: processedKillmail.total_value,
            fitting_value: processedKillmail.fitting_value,
            ship_value: processedKillmail.ship_value,
            constellation_id: processedKillmail.constellation_id,
            region_id: processedKillmail.region_id,
            is_npc: processedKillmail.is_npc,
            is_solo: processedKillmail.is_solo,
            dna: processedKillmail.dna,
            near: processedKillmail.near,
        };

        // Enrich the killmail with calculated values
        await KillmailService.enrichKillmail(killmailId, enrichmentData);

        // Return the processed killmail data
        return processedKillmail;
    } catch (error: any) {
        // Mark killmail as delayed for retry
        const delayUntil = new Date(Date.now() + 30000); // 30 seconds delay
        await KillmailService.markAsDelayed(
            killmailId,
            delayUntil,
            error.message
        );
        throw error;
    }
}

/**
 * Get unprocessed killmails for batch processing
 */
async function getUnprocessedKillmails(limit: number = 100) {
    return await KillmailService.findUnprocessed(limit);
}

/**
 * Mark killmail as processed
 */
async function markKillmailAsProcessed(killmailId: number) {
    return await KillmailService.markAsProcessed(killmailId);
}

/**
 * Add multiple killmails to the queue
 */
async function addKillmailBatch(
    killmails: Array<{
        killmailId: number;
        killmailHash: string;
        warId?: number;
        priority?: number;
    }>
) {
    const jobs = killmails.map((km) => ({
        name: "killmail",
        data: {
            killmailId: km.killmailId,
            killmailHash: km.killmailHash,
            warId: km.warId || 0,
        },
        opts: {
            priority: km.priority || 1,
            attempts: 10,
            backoff: {
                type: "fixed",
                delay: 5000,
            },
            removeOnComplete: 1000,
            removeOnFail: 5000,
        },
    }));

    await killmailQueue.addBulk(jobs);
}

export {
    addKillmail,
    addKillmailBatch,
    getUnprocessedKillmails,
    markKillmailAsProcessed,
    processKillmail,
};
