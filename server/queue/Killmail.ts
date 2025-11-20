import { fetchESIKillmail } from "../helpers/ESIData";
import { parseKillmail } from "../helpers/KillmailParser";
import { createQueue } from "../helpers/Queue";
import { KillmailService } from "../services";

const killmailQueue = createQueue("killmail");

async function addKillmail(
    killmailId: number,
    killmailHash: string,
    warId = 0,
    priority = 1
) {
    await killmailQueue.add(
        "killmail",
        { killmailId, killmailHash, warId },
        {
            priority,
            attempts: 10,
            backoff: { type: "fixed", delay: 5000 },
            removeOnComplete: 1000,
            removeOnFail: 5000,
        }
    );
}

async function processKillmail(
    killmailId: number,
    killmailHash: string,
    warId = 0
) {
    const killmail = await fetchESIKillmail(killmailId, killmailHash);

    // Create base record + victim/attackers
    await KillmailService.createFromESI(killmail);

    // Enrich, update stats/achievements, and return normalized data
    const processedKillmail = await parseKillmail(killmail, warId);

    await KillmailService.enrichKillmail(killmailId, {
        total_value: processedKillmail.total_value,
        fitting_value: processedKillmail.fitting_value,
        ship_value: processedKillmail.ship_value,
        constellation_id: processedKillmail.constellation_id,
        region_id: processedKillmail.region_id,
        is_npc: processedKillmail.is_npc,
        is_solo: processedKillmail.is_solo,
        dna: processedKillmail.dna,
        near: processedKillmail.near,
    });

    return processedKillmail;
}

export { addKillmail, processKillmail };
