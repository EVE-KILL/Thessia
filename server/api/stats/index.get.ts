import {
  killCount,
  mostValuableKills,
  mostValuableShips,
  mostValuableStructures,
  newCharacters,
  topAlliances,
  topCharacters,
  topConstellations,
  topCorporations,
  topRegions,
  topShips,
  topSolo,
  topSystems,
} from "~/server/helpers/TopLists"; // Adjust path as needed

export default defineEventHandler(async (event) => {
  const query = getQuery(event);
  const type = (query.type as string) || ""; // Type can be empty

  // Parse days and limit from query
  // If not provided, default to something sensible depending on the query
  let days = 7;
  if (query.days !== undefined) {
    const parsedDays = Number.parseInt(query.days as string, 10);
    days = Number.isNaN(parsedDays) ? 7 : parsedDays; // Default to 7 instead of null
  }

  let limit = 10;
  if (query.limit !== undefined) {
    const parsedLimit = Number.parseInt(query.limit as string, 10);
    limit = Number.isNaN(parsedLimit) ? 10 : parsedLimit; // Default to 10 instead of null
  }

  // Map type to the appropriate function call
  // We assume each function can handle null days/limit by using its own defaults as coded previously.
  const statsQueries: Record<string, () => Promise<any>> = {
    characters: () => topCharacters(null, null, days, limit),
    corporations: () => topCorporations(null, null, days, limit),
    alliances: () => topAlliances(null, null, days, limit),
    solarsystems: () => topSystems(null, null, days, limit),
    constellations: () => topConstellations(null, null, days, limit),
    regions: () => topRegions(null, null, days, limit),
    ships: () => topShips(null, null, days, limit),
    solo: () => topSolo(null, null, days, limit),
    most_valuable_kills: () => mostValuableKills(days, limit),
    most_valuable_structures: () => mostValuableStructures(days, limit),
    most_valuable_ships: () => mostValuableShips(days, limit),
    kill_count: () => killCount(days),
    new_characters: () => newCharacters(),
  };

  const handler = statsQueries[type];
  if (!handler) {
    return { error: `Invalid type provided: ${type}`, types: Object.keys(statsQueries) };
  }

  try {
    const result = await handler();
    return result;
  } catch (error) {
    console.error(`Error fetching stats for type ${type}:`, error);
    return { error: "Failed to fetch data", message: error.message };
  }
});
