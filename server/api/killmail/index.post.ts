import { fetchESIKillmail } from "../../helpers/ESIData";
import { parseKillmail } from "../../helpers/KillmailParser";
import { KillmailService } from "~/server/services";

export default defineEventHandler(async (event) => {
    const body = await readBody(event);

    const { killmail_id, killmail_hash } = body;

    if (typeof killmail_id !== "number") {
        return { error: "killmail_id is missing or not a number" };
    }

    if (typeof killmail_hash !== "string") {
        return { error: "killmail_hash is missing or not a string" };
    }

    // Check if killmail already exists
    const existing = await KillmailService.findById(killmail_id);
    if (existing) {
        return { error: "Killmail already exists" };
    }

    // Fetch from ESI
    const esiKillmail = await fetchESIKillmail(killmail_id, killmail_hash);
    if (!esiKillmail || esiKillmail.error) {
        return {
            error: "Error fetching killmail from ESI",
            esiError: esiKillmail?.error || "",
        };
    }

    if (
        !esiKillmail.victim ||
        !esiKillmail.attackers ||
        !Array.isArray(esiKillmail.attackers) ||
        esiKillmail.attackers.length === 0
    ) {
        return {
            error: `Error fetching killmail (KillmailID: ${killmail_id}): ${
                esiKillmail.error ||
                "Invalid killmail data - missing victim or attackers"
            }`,
        };
    }

    // Store raw ESI killmail (Prisma)
    await KillmailService.createFromESI(esiKillmail);

    // Process killmail into normalized/enriched form
    const processed = await parseKillmail(esiKillmail);
    await KillmailService.enrichKillmail(processed.killmail_id!, {
        total_value: processed.total_value || 0,
        fitting_value: processed.fitting_value || 0,
        ship_value: processed.ship_value || 0,
        constellation_id: processed.constellation_id || null,
        region_id: processed.region_id || null,
        is_npc: processed.is_npc || false,
        is_solo: processed.is_solo || false,
        dna: processed.dna || null,
        near: processed.near || null,
    });

    return {
        success: "Killmail saved",
        esi: esiKillmail,
        killmail: processed,
    };
});
