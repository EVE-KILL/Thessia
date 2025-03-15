import {
  topCharacters,
  topCorporations,
  topAlliances,
  topSystems,
  topConstellations,
  topRegions,
  topShips,
  topSolo,
  mostValuableKills,
  mostValuableStructures,
  mostValuableShips,
  killCount,
  newCharacters,
} from "../../helpers/TopLists"; // Adjust path as needed

export default defineEventHandler(async (event) => {
  const query = getQuery(event);
  const type = (query.type as string) || ""; // Type can be empty

  // Parse days and limit from query
  // If not provided, default to something sensible depending on the query
  let days = 7;
  if (query.days !== undefined) {
    const parsedDays = Number.parseInt(query.days as string, 10);
    days = Number.isNaN(parsedDays) ? null : parsedDays;
  }

  let limit = 10;
  if (query.limit !== undefined) {
    const parsedLimit = Number.parseInt(query.limit as string, 10);
    limit = Number.isNaN(parsedLimit) ? null : parsedLimit;
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
    most_valuable_kills: () => mostValuableKills(days ?? 7, limit),
    most_valuable_structures: () => mostValuableStructures(days ?? 7, limit),
    most_valuable_ships: () => mostValuableShips(days ?? 7, limit),
    kill_count: () => killCount(days ?? 7),
    new_characters: () => newCharacters(),
  };

  const handler = statsQueries[type];
  if (!handler) {
    return { error: `Invalid type provided: ${type}`, types: Object.keys(statsQueries) };
  }

  const result = await handler();
  return result;
});
