import { cliLogger } from "../server/helpers/Logger";
import { createQueue } from "../server/helpers/Queue";
import { KillmailService } from "../server/services/KillmailService";

export default {
    name: "processUnprocessedKillmails",
    description: "Process unprocessed killmails",
    schedule: "* * * * *",
    run: async () => {
        // Load up the killmail queue
        const killmailQueue = createQueue("killmail");

        // If the queue has unprocessed killmails, don't add more
        const queueCount = await killmailQueue.count();
        if (queueCount > 0) {
            return {
                result: {
                    foundKillmailCount: 0,
                },
            };
        }

        // Limit it to 100k mails at a time
        const limit = 100000;

        // Find unprocessed killmails using the new KillmailService
        const unprocessedKillmails = await KillmailService.findUnprocessed(
            limit
        );

        if (unprocessedKillmails.length === 0) {
            return {
                result: {
                    foundKillmailCount: 0,
                },
            };
        }

        // Note: We need killmail_hash for processing, but the normalized schema doesn't store it separately
        // For now, we'll queue the killmails with a placeholder hash - the queue processor will handle fetching
        await killmailQueue.addBulk(
            unprocessedKillmails.map((killmail) => ({
                name: "killmail",
                data: {
                    killmailId: killmail.killmail_id,
                    killmailHash: killmail.killmail_hash, // This is stored in the main killmail table
                    warId: killmail.war_id || 0,
                },
                opts: {
                    priority: 5,
                    attempts: 10,
                    backoff: {
                        type: "fixed",
                        delay: 5000, // 5 seconds
                    },
                    removeOnComplete: true,
                    removeOnFail: true,
                },
            }))
        );

        cliLogger.info(
            `Added ${unprocessedKillmails.length} unprocessed killmails to the queue`
        );

        return {
            result: {
                foundKillmailCount: unprocessedKillmails.length,
            },
        };
    },
};
