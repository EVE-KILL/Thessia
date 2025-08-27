import { createQueue } from "../helpers/Queue";

const characterKillmailQueue = createQueue("character-killmails");

async function addCharacterKillmailJob(
    userId: string,
    characterId: number,
    characterName: string,
    priority = 5
) {
    await characterKillmailQueue.add(
        "process-character",
        {
            userId,
            characterId,
            characterName,
        },
        {
            priority: priority,
            attempts: 3,
            backoff: {
                type: "exponential",
                delay: 5000, // Start with 5 seconds
            },
            removeOnComplete: 100,
            removeOnFail: 50,
            // Use characterId as job ID to prevent duplicate processing
            jobId: `character-${characterId}`,
        }
    );
}

export { addCharacterKillmailJob, characterKillmailQueue };
