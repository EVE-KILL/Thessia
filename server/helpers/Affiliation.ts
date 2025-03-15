import { esiFetcher } from "../helpers/ESIFetcher";
import { Characters } from "../models/Characters";
import { queueUpdateAlliance } from "../queue/Alliance";
import { queueUpdateCharacter } from "../queue/Character";
import { queueUpdateCorporation } from "../queue/Corporation";

async function processChunk(characters: ICharacters[], attempt = 0): Promise<number> {
  let queuedCount = 0;
  const affiliations: ICharacters[] = await fetchAffiliations(characters, attempt);

  const originalDataLookup = {};
  for (const character of characters) {
    originalDataLookup[character.character_id] = character;
  }

  const affiliationLookup = {};
  for (const affiliation of affiliations) {
    affiliationLookup[affiliation.character_id] = affiliation;
  }

  const updates: Partial<ICharacters>[] = [];
  for (const affiliation of affiliations) {
    const characterId = affiliation.character_id;

    const originalData = originalDataLookup[characterId];
    if (!originalData) {
      continue;
    }

    if (
      affiliation.corporation_id &&
      originalData.corporation_id &&
      affiliation.corporation_id !== originalData.corporation_id
    ) {
      updates.push({
        character_id: characterId,
        corporation_id: affiliation.corporation_id,
      });
    }

    // Opdater alliance_id hvis der er ændring
    if (
      affiliation.alliance_id &&
      originalData.alliance_id &&
      affiliation.alliance_id !== originalData.alliance_id
    ) {
      updates.push({
        character_id: characterId,
        alliance_id: affiliation.alliance_id,
      });
    }
  }

  // For each update, update the corporation / alliance using the queue
  for (const update of updates) {
    await queueUpdateCharacter(update.character_id);
    if (update.corporation_id) {
      await queueUpdateCorporation(update.corporation_id);
    }
    if (update.alliance_id) {
      await queueUpdateAlliance(update.alliance_id);
    }
    queuedCount++;
  }

  // All the characters that did not need an update, needs to be updated separately with a new updatedAt time, to ensure they aren't processed again for another 24h
  // Use the updates array to filter out the characters that were updated - and remove them from the original data, and then update the rest
  const updatedCharacterIds = updates.map((update) => update.character_id);
  const charactersToUpdate = characters.filter(
    (character) => !updatedCharacterIds.includes(character.character_id),
  );
  for (const character of charactersToUpdate) {
    await Characters.updateOne(
      {
        character_id: character.character_id,
      },
      {
        updatedAt: new Date(),
      },
    );
  }

  return queuedCount;
}

async function fetchAffiliations(characters: ICharacters[], attempts = 0) {
  // We can fetch upto 1000 characters at the same time against the affiliation endpoint
  // However, if one of the characters fails in the affiliation endpoint, we get an error back from ESI
  // At that point, we have to split the amount of characters we are fetching by half, and try each half separately
  // If a half works, it's processed, if it fails, we split it again
  // This is done 3 times - at which point the failing half is processed one by one via the queue (For now just placeholder it for submission as character_id: character_id)
  let affiliations = [];
  const character_ids = characters.map((character) => character.character_id);

  try {
    const response = await esiFetcher(
      `${process.env.ESI_URL || "https://esi.evetech.net/"}v1/characters/affiliation/`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(character_ids),
      },
    );

    // Merge the response with the affiliations
    affiliations = affiliations.concat(response);
  } catch (error) {
    if (attempts > 3) {
      console.log("Failed to fetch affiliations for characters", character_ids);
      for (const character_id of character_ids) {
        queueUpdateCharacter(character_id);
      }
    } else {
      // Split character_ids into two halves
      const half = Math.ceil(character_ids.length / 2);

      // Process both halves
      const firstHalfAttempts = attempts;
      const secondHalfAttempts = attempts;
      const firstHalf = processChunk(characters.slice(0, half), firstHalfAttempts + 1);
      const secondHalf = processChunk(characters.slice(half), secondHalfAttempts + 1);

      // Merge the results
      affiliations = affiliations.concat(firstHalf, secondHalf);
    }
  }

  return affiliations;
}

interface ICharacters {
  character_id: number;
  corporation_id: number;
  alliance_id: number;
}

export { processChunk };
