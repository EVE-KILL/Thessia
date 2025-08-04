import { cliLogger } from "../server/helpers/Logger";
import { createQueue } from "../server/helpers/Queue";
import type { IESIKillmail } from "../server/interfaces/IESIKillmail";
import { KillmailsESI } from "../server/models/KillmailsESI";

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

        const now = new Date();

        // Limit it to 100k mails at a time
        const limit = 100000;

        // Find unprocessed killmails that are either:
        // 1. Not delayed (delayedUntil is null/undefined)
        // 2. Have passed their delay time (delayedUntil <= now)
        const unprocessedKillmails: IESIKillmail[] = await KillmailsESI.find(
            {
                processed: false,
                $or: [
                    { delayedUntil: { $exists: false } },
                    { delayedUntil: null },
                    { delayedUntil: { $lte: now } },
                ],
            },
            { killmail_id: 1, killmail_hash: 1 },
            { limit: limit }
        );

        if (unprocessedKillmails.length === 0) {
            return {
                result: {
                    foundKillmailCount: 0,
                },
            };
        }

        await killmailQueue.addBulk(
            unprocessedKillmails.map((killmail) => ({
                name: "killmail",
                data: {
                    killmailId: killmail.killmail_id,
                    killmailHash: killmail.killmail_hash,
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
