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
                    const existingKillmail = await KillmailsESI.findOne({
                        killmail_id: killmailId,
                        killmail_hash: killmailHash,
                    });

                    if (existingKillmail) {
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
