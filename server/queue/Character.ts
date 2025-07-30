import { getCharacter, getCharacterHistory } from "~/server/helpers/ESIData";
import { cliLogger } from "~/server/helpers/Logger";
import { createQueue } from "~/server/helpers/Queue";

const characterQueue = createQueue("character");
const characterHistoryQueue = createQueue("characterhistory");

async function queueUpdateCharacter(
    characterId: number,
    priority = 1,
    attempts = 10
) {
    await characterQueue.add(
        "character",
        { characterId: characterId },
        {
            priority: priority,
            attempts: attempts,
            backoff: {
                type: "fixed",
                delay: 5000, // 5 seconds
            },
            removeOnComplete: 1000,
            removeOnFail: 5000,
        }
    );
}

/**
 * Bulk add multiple character update jobs to the queue for improved performance
 */
async function queueBulkUpdateCharacters(
    characters: Array<{
        characterId: number;
        priority?: number;
        attempts?: number;
    }>
) {
    if (characters.length === 0) {
        cliLogger.info("Character queue: No characters to add in bulk");
        return;
    }

    // Convert to BullMQ job format
    const bulkJobs = characters.map((character) => ({
        name: "character",
        data: {
            characterId: character.characterId,
        },
        opts: {
            priority: character.priority || 1,
            attempts: character.attempts || 10,
            backoff: {
                type: "fixed" as const,
                delay: 5000, // 5 seconds
            },
            removeOnComplete: 1000,
            removeOnFail: 5000,
        },
    }));

    await characterQueue.addBulk(bulkJobs);
    cliLogger.info(
        `Character queue: Added ${characters.length} character jobs in bulk`
    );
}

async function queueUpdateCharacterHistory(characterId: number, priority = 1) {
    await characterHistoryQueue.add(
        "characterhistory",
        { characterId: characterId },
        {
            priority: priority,
            attempts: 10,
            backoff: {
                type: "fixed",
                delay: 5000, // 5 seconds
            },
            removeOnComplete: true,
        }
    );
}

async function updateCharacter(characterId: number) {
    await getCharacter(characterId, true);
}

async function updateCharacterHistory(characterId: number) {
    await getCharacterHistory(characterId);
}

export {
    queueBulkUpdateCharacters,
    queueUpdateCharacter,
    queueUpdateCharacterHistory,
    updateCharacter,
    updateCharacterHistory,
};
