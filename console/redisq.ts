import { IESIKillmail } from "~/server/interfaces/IESIKillmail";
import { cliLogger } from "../server/helpers/Logger";
import { KillmailsESI } from "../server/models/KillmailsESI";
import { addKillmail } from "../server/queue/Killmail";

export default {
    name: "redisq",
    description: "Listen to zKillboards redisQ and import killmails from it",
    longRunning: true,
    run: async () => {
        const queueUrl = `https://zkillredisq.stream/listen.php?queueID=${process.env.REDISQ_ID}`;
        const pollRedisQ = async () => {
            try {
                const response = await fetch(queueUrl, {
                    headers: { "User-Agent": "EVE-KILL" },
                });
                const data = await response.json();
                if (data?.package) {
                    const killmailId = data.package.killID;
                    const killmailHash = data.package.zkb.hash;

                    // Check if killmail already exists in database
                    const existingKillmail: IESIKillmail | null =
                        await KillmailsESI.findOne({
                            killmail_id: killmailId,
                            killmail_hash: killmailHash,
                        });

                    if (existingKillmail) {
                        const shortDate = new Date(
                            existingKillmail.killmail_time
                        ).toLocaleDateString("da-DK", {
                            year: "numeric",
                            month: "2-digit",
                            day: "2-digit",
                            hour: "2-digit",
                            minute: "2-digit",
                        });
                        cliLogger.info(
                            `ℹ️  Killmail already exists: ${killmailId} - ${killmailHash} - Timestamp ${shortDate}`
                        );
                        return;
                    }

                    cliLogger.info(
                        `ℹ️  New killmail: ${killmailId} - ${killmailHash}`
                    );
                    await addKillmail(killmailId, killmailHash, 0, 1);
                }
            } catch (error) {
                console.error("Error fetching killmails:", error);
            } finally {
                setTimeout(pollRedisQ, 500);
            }
        };

        console.log("✔ Starting RedisQ listener");
        pollRedisQ();
    },
};
