export default defineEventHandler(async (event) => {
    const body = await readBody(event);

    const { killmail_id, killmail_hash } = body;

    if (typeof killmail_id !== "number") {
        return { error: "killmail_id is missing or not a number" };
    }

    if (typeof killmail_hash !== "string") {
        return { error: "killmail_hash is missing or not a string" };
    }

    // Check if we already have the ESI data, if not fetch it
    let esiKillmail: IESIKillmail | null = await KillmailsESI.findOne({
        killmail_id: killmail_id,
        killmail_hash: killmail_hash,
    });

    // If we don't have the ESI data, fetch it from ESI
    if (!esiKillmail) {
        esiKillmail = await fetchESIKillmail(killmail_id, killmail_hash);
        if (!esiKillmail || esiKillmail.error) {
            return {
                error: "Error fetching killmail from ESI",
                esiError: esiKillmail.error || "",
            };
        }

        // Validate killmail data before saving - ensure it has victim and attackers
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

        // Save the valid ESI killmail data to the database
        const km_esi = new KillmailsESI(esiKillmail);
        try {
            await km_esi.save();
        } catch (error) {
            await KillmailsESI.updateOne(
                { killmail_id: killmail_id },
                esiKillmail
            );
        }
    }

    // Check if killmail already exists in the processed collection
    const existingProcessedKillmail = await Killmails.findOne({
        killmail_id: killmail_id,
    });
    if (existingProcessedKillmail) {
        return { error: "Killmail already exists" };
    }

    // Process killmail and save to database
    const killmail: Partial<IKillmail> = await parseKillmail(esiKillmail);
    if (!killmail) {
        return { error: "Error parsing killmail" };
    }

    // Save killmail to database
    const km = new Killmails(killmail);
    try {
        await km.save();
    } catch (error) {
        Killmails.updateOne({ killmail_id: killmail.killmail_id }, killmail);
    }

    return { success: "Killmail saved", esi: esiKillmail, killmail: killmail };
});
