import { fetchESIKillmail } from "~/server/helpers/ESIData";
import { parseKillmail } from "~/server/helpers/KillmailParser";
import { ESIKillmail } from "~/types/IESIKillmail";
import { Killmail } from "~/types/IKillmail";

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
    let existingKillmail: ESIKillmail | null = await KillmailsESI.findOne({ killmail_id: killmail_id, killmail_hash: killmail_hash });
    if (existingKillmail) {
        return { error: "Killmail already exists" };
    }

    // Fetch killmail from ESI
    let esiKillmail: ESIKillmail | null = await fetchESIKillmail(killmail_id, killmail_hash);
    if (!esiKillmail) {
        return { error: "Error fetching killmail from ESI" };
    }

    // Process killmail and save to database
    let killmail: Killmail = await parseKillmail(esiKillmail);
    if (!killmail) {
        return { error: "Error parsing killmail" };
    }

    // Save killmail to database
    let km = new Killmails(killmail);
    try {
        await km.save();
    } catch (error) {
        Killmails.updateOne({ killmail_id: killmail.killmail_id }, killmail);
    }

    return { success: "Killmail saved", esi: esiKillmail, killmail: killmail };
});
