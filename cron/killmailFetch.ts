import { cliLogger } from "../server/helpers/Logger";
import { Users } from "../server/models/Users";
import { addCharacterKillmailJob } from "../server/queue/CharacterKillmails";

export default {
    name: "killmailFetch",
    description: "Queues characters for killmail fetching",
    schedule: "* * * * *",
    run: async () => {
        try {
            cliLogger.info("Starting killmail fetch job - queuing characters");

            // Fetch all users that haven't been checked in the last 5 minutes
            const users = await Users.find(
                { lastChecked: { $lt: new Date(Date.now() - 60 * 5 * 1000) } },
                {
                    _id: 1,
                    characterId: 1,
                    characterName: 1,
                }
            );

            cliLogger.info(
                `Found ${users.length} users to queue for processing`
            );

            // Queue each user for processing
            let queuedCount = 0;
            for (const user of users) {
                try {
                    await addCharacterKillmailJob(
                        (user as any)._id.toString(),
                        (user as any).characterId,
                        (user as any).characterName,
                        5 // Default priority
                    );
                    queuedCount++;
                } catch (queueError) {
                    cliLogger.error(
                        `Error queuing character ${
                            (user as any).characterName
                        } (${(user as any).characterId}): ${queueError}`
                    );
                }
            }

            cliLogger.info(
                `Successfully queued ${queuedCount}/${users.length} characters for killmail processing`
            );
        } catch (error) {
            cliLogger.error(`Fatal error in killmail fetch job: ${error}`);
            throw error; // Re-throw to ensure the job is marked as failed
        }
    },
};
