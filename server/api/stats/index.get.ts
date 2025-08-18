export default defineCachedEventHandler(
    async (event) => {
        const query = getQuery(event);

        // Use dataType consistently (no more 'type' parameter)
        const dataType = (query.dataType as string) || "";

        // Parse days and limit from query
        let days = 7;
        if (query.days !== undefined) {
            const parsedDays = Number.parseInt(query.days as string, 10);
            days = Number.isNaN(parsedDays) ? 7 : parsedDays;
        }

        let limit = 10;
        if (query.limit !== undefined) {
            const parsedLimit = Number.parseInt(query.limit as string, 10);
            limit = Number.isNaN(parsedLimit) ? 10 : parsedLimit;
        }

        // Map dataType to the appropriate function call
        const statsQueries: Record<string, () => Promise<any>> = {
            characters: () => topCharacters(null, null, days, limit),
            corporations: () => topCorporations(null, null, days, limit),
            alliances: () => topAlliances(null, null, days, limit),
            systems: () => topSystems(null, null, days, limit),
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

        const handler = statsQueries[dataType];
        if (!handler) {
            return {
                error: `Invalid dataType provided: ${dataType}`,
                dataTypes: Object.keys(statsQueries),
            };
        }

        try {
            const result = await handler();
            return result;
        } catch (error: any) {
            console.error(
                `Error fetching stats for dataType ${dataType}:`,
                error
            );
            return { error: "Failed to fetch data", message: error.message };
        }
    },
    {
        maxAge: 3600,
        staleMaxAge: -1,
        swr: true,
        getKey: (event) => {
            const query = getQuery(event);
            const dataType = (query.dataType as string) || "all";
            const days = query.days ? (query.days as string) : "7";
            const limit = query.limit ? (query.limit as string) : "10";

            return `stats:dataType:${dataType}:days:${days}:limit:${limit}`;
        },
    }
);
