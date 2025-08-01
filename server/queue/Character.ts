import { getCharacter, getCharacterHistory } from "../helpers/ESIData";
import { cliLogger } from "../helpers/Logger";
import { createQueue } from "../helpers/Queue";
import { Corporations } from "../models/Corporations";
import { queueUpdateCorporation } from "../queue/Corporation";

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
    const characterData = await getCharacter(characterId, true);

    // Check if the corporation exists, if not queue it for update
    if (characterData.corporation_id && characterData.corporation_id > 0) {
        try {
            const corporation = await Corporations.findOne({
                corporation_id: characterData.corporation_id,
            });

            if (!corporation) {
                await queueUpdateCorporation(characterData.corporation_id, 2); // Higher priority
                cliLogger.info(
                    `Queued corporation ${characterData.corporation_id} for character ${characterId}`
                );
            }
        } catch (error) {
            cliLogger.error(
                `Error checking/queuing corporation for character ${characterId}: ${
                    error instanceof Error ? error.message : String(error)
                }`
            );
        }
    }
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
