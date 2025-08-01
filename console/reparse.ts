import { Killmails } from "../server/models/Killmails";
import { KillmailsESI } from "../server/models/KillmailsESI";

export default {
    name: "reparse",
    description: "",
    longRunning: false,
    run: async () => {
        // Find all killmails where the victim is a titan or supercarrier (Groupid 30 or 659)
        const killmails = await Killmails.find(
            {
                $or: [
                    //{ "victim.ship_group_id": 30 },
                    //{ "victim.ship_group_id": 659 },
                    { "victim.ship_id": 87381 }, // Sarathiel
                ],
            },
            { _id: 0, killmail_id: 1, killmail_hash: 1 }
        );

        // Loop through the killmails and reparse them (set processed to false)
        for (const killmail of killmails) {
            const killmailId = killmail.killmail_id;
            const killmailHash = killmail.killmail_hash;

            // Find the killmail in the KillmailsESI collection
            const killmailESI = await KillmailsESI.findOne({
                killmail_id: killmailId,
            });

            if (killmailESI) {
                // Set processed to false
                await KillmailsESI.updateOne(
                    { killmail_id: killmailId },
                    { $set: { processed: false } }
                );
                console.log(
                    `Reparsed killmail ${killmailId} (${killmailHash})`
                );
            }
        }
    },
};
