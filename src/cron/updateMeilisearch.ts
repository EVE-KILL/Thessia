import { cliLogger } from "~/server/helpers/Logger";
import { Meilisearch } from "~/server/helpers/Meilisearch";
import type { IAlliance } from "~/server/interfaces/IAlliance";
import type { ICharacter } from "~/server/interfaces/ICharacter";
import type { ICorporation } from "~/server/interfaces/ICorporation";
import type { IFaction } from "~/server/interfaces/IFaction";
import type { ISolarSystem } from "~/server/interfaces/ISolarSystem";
import { Alliances } from "~/server/models/Alliances";
import { Characters } from "~/server/models/Characters";
import { Corporations } from "~/server/models/Corporations";
import { Factions } from "~/server/models/Factions";
import { InvTypes } from "~/server/models/InvTypes";
import { Regions } from "~/server/models/Regions";
import { SolarSystems } from "~/server/models/SolarSystems";

const BATCH_SIZE = 100000;

type EntityTypes =
  | "characters"
  | "corporations"
  | "alliances"
  | "factions"
  | "systems"
  | "regions"
  | "items";

/**
 * Cron job that updates all entities in Meilisearch for search functionality
 * Runs daily to ensure search data is current
 */
export default {
  name: "updateMeilisearch",
  description: "Update entities in Meilisearch",
  schedule: "0 0 * * *",
  run: async () => {
    const meilisearch = new Meilisearch();
    const startTime = Date.now();

    // Drop the placeholder index if it exists
    const indexExists = await meilisearch.existsIndex("nitro-update");
    if (indexExists) {
      await meilisearch.deleteIndex("nitro-update");
    }

    // Create a placeholder index
    await meilisearch.createIndex("nitro-update");

    // Ensure the nitro index exists
    await meilisearch.createIndex("nitro");

    // Set ranking rules to prioritize based on rank field, then word position etc.
    await meilisearch.updateRankingRules("nitro-update", [
      "rank:asc", // Lower rank values appear first (items=1, characters=7)
      "words",
      "typo",
      "proximity",
      "attribute",
      "sort",
      "exactness",
    ]);

    // Configure filterable attributes to enable language filtering
    await meilisearch.updateFilterableAttributes("nitro-update", [
      "type",
      "rank",
      "lang",
      "originalId",
    ]);

    const entityTypes: EntityTypes[] = [
      "characters",
      "corporations",
      "alliances",
      "factions",
      "systems",
      "regions",
      "items",
    ];

    const resultCount: Record<EntityTypes, number> = {
      characters: 0,
      corporations: 0,
      alliances: 0,
      factions: 0,
      systems: 0,
      regions: 0,
      items: 0,
    };

    // Process each entity type and update their records in Meilisearch
    for (const entityType of entityTypes) {
      resultCount[entityType] = await processEntities(entityType, meilisearch);
    }

    // Replace the nitro index with nitro-update
    await meilisearch.replaceIndex("nitro", "nitro-update");
    await meilisearch.deleteIndex("nitro-update");

    const duration = (Date.now() - startTime) / 1000;
    const totalCount = Object.values(resultCount).reduce((sum, count) => sum + count, 0);

    return cliLogger.info(
      `Updated Meilisearch with ${totalCount.toLocaleString()} entities in ${duration.toFixed(2)} seconds`,
    );
  },
};

/**
 * Process entities of a specific type and add them to Meilisearch
 *
 * @param entityType - Type of entity to process
 * @param meilisearch - Meilisearch instance
 * @returns Number of processed entities
 */
async function processEntities(entityType: EntityTypes, meilisearch: Meilisearch): Promise<number> {
  let count = 0;
  let skip = 0;
  let hasMore = true;

  while (hasMore) {
    const entities = await getEntities(entityType, skip, BATCH_SIZE);
    if (entities.length > 0) {
      await meilisearch.addDocuments("nitro-update", entities);
      count += entities.length;
      skip += BATCH_SIZE;
    }
    hasMore = entities.length === BATCH_SIZE;
  }

  return count;
}

/**
 * Get entities of a specific type for indexing in Meilisearch
 *
 * @param entityType - Type of entity to retrieve
 * @param skip - Number of documents to skip for pagination
 * @param limit - Maximum number of documents to return
 * @returns Array of entities formatted for Meilisearch indexing
 */
async function getEntities(entityType: EntityTypes, skip: number, limit: number) {
  switch (entityType) {
    case "characters": {
      const characters = await Characters.find(
        { deleted: false },
        {
          character_id: 1,
          name: 1,
        },
      )
        .skip(skip)
        .limit(limit);
      return characters.map((character: ICharacter) => ({
        id: character.character_id,
        name: character.name,
        type: "character",
        rank: 7,
        lang: "all", // Add this field for searchability
      }));
    }

    case "corporations": {
      const corporations = await Corporations.find(
        {},
        {
          corporation_id: 1,
          name: 1,
          ticker: 1,
        },
      )
        .skip(skip)
        .limit(limit);
      return corporations.map((corporation: ICorporation) => ({
        id: corporation.corporation_id,
        name: corporation.name,
        ticker: corporation.ticker,
        type: "corporation",
        rank: 6,
        lang: "all", // Add this field for searchability
      }));
    }

    case "alliances": {
      const alliances = await Alliances.find(
        {},
        {
          alliance_id: 1,
          name: 1,
          ticker: 1,
        },
      )
        .skip(skip)
        .limit(limit);
      return alliances.map((alliance: IAlliance) => ({
        id: alliance.alliance_id,
        name: alliance.name,
        ticker: alliance.ticker,
        type: "alliance",
        rank: 5,
        lang: "all", // Add this field for searchability
      }));
    }

    case "factions": {
      const factions = await Factions.find(
        {},
        {
          faction_id: 1,
          name: 1,
        },
      )
        .skip(skip)
        .limit(limit);
      return factions.map((faction: IFaction) => ({
        id: faction.faction_id,
        name: faction.name,
        type: "faction",
        rank: 4,
        lang: "all", // Add this field for searchability
      }));
    }

    case "systems": {
      const systems = await SolarSystems.find(
        {},
        {
          system_id: 1,
          system_name: 1,
        },
      )
        .skip(skip)
        .limit(limit);
      return systems.map((system: ISolarSystem) => ({
        id: system.system_id,
        name: system.system_name,
        type: "system",
        rank: 3,
        lang: "all", // Add this field for searchability
      }));
    }

    case "regions": {
      const regions = await Regions.find(
        {},
        {
          region_id: 1,
          name: 1,
        },
      )
        .skip(skip)
        .limit(limit);

      // Create separate searchable documents for each available language
      const translatedRegions = [];
      for (const region of regions) {
        // Get the keys inside of region.name directly instead of hardcoding languages
        const languages = Object.keys(region.name);

        for (const lang of languages) {
          translatedRegions.push({
            id: `${region.region_id}_${lang}`,
            originalId: region.region_id,
            name: region.name[lang] || region.name.en, // Fallback to English if translation is missing
            type: "region",
            rank: 2,
            lang,
          });
        }
      }

      return translatedRegions;
    }

    case "items": {
      const items = await InvTypes.find(
        { published: true },
        {
          type_id: 1,
          name: 1,
        },
      )
        .skip(skip)
        .limit(limit);

      // Create separate searchable documents for each available language
      const translatedItems = [];
      for (const item of items) {
        // Get the keys inside of item.name directly instead of hardcoding languages
        const languages = Object.keys(item.name);

        for (const lang of languages) {
          translatedItems.push({
            id: `${item.type_id}_${lang}`,
            originalId: item.type_id,
            name: item.name[lang] || item.name.en, // Fallback to English if translation is missing
            type: "item",
            rank: 1,
            lang,
          });
        }
      }

      return translatedItems;
    }

    default:
      return [];
  }
}
