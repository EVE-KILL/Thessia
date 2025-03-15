import { getCharacter, getCharacterHistory } from "../helpers/ESIData";
import { createQueue } from "../helpers/Queue";

const characterQueue = createQueue("character");
const characterHistoryQueue = createQueue("characterhistory");

async function queueUpdateCharacter(characterId: number, priority = 1) {
  await characterQueue.add(
    "character",
    { characterId: characterId },
    {
      priority: priority,
      attempts: 10,
      backoff: {
        type: "fixed",
        delay: 5000, // 5 seconds
      },
      removeOnComplete: 1000,
      removeOnFail: 5000,
    },
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
    },
  );
}

async function updateCharacter(characterId: number) {
  await getCharacter(characterId, true);
}

async function updateCharacterHistory(characterId: number) {
  await getCharacterHistory(characterId);
}

export {
  queueUpdateCharacter,
  queueUpdateCharacterHistory,
  updateCharacter,
  updateCharacterHistory,
};
