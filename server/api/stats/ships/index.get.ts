/**
 * Returns a list of most lost ships (ships that were destroyed)
 * @param dateFrom - Start date for the query
 * @param dateTo - End date for the query
 * @param limit - Maximum number of results to return, defaults to 10
 */
async function topLostShips(
    dateFrom: Date | null = null,
    dateTo: Date | null = null,
    limit = 10
) {
    // Calculate time range - default to last 7 days if no dates provided
    let calculatedTimeFrom: Date;
    let calculatedTimeTo: Date;

    if (dateFrom && dateTo) {
        calculatedTimeFrom = dateFrom;
        calculatedTimeTo = dateTo;
    } else if (dateFrom) {
        calculatedTimeFrom = dateFrom;
        calculatedTimeTo = new Date();
    } else if (dateTo) {
        // If only dateTo is provided, go back 7 days from that date
        calculatedTimeFrom = new Date(
            dateTo.getTime() - 7 * 24 * 60 * 60 * 1000
        );
        calculatedTimeTo = dateTo;
    } else {
        // Default to last 7 days
        calculatedTimeTo = new Date();
        calculatedTimeFrom = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    }

    const matchFilter: any = {
        kill_time: { $gte: calculatedTimeFrom, $lte: calculatedTimeTo },
        "victim.ship_id": { $nin: [0, 670] }, // Exclude pods and invalid ships
    };

    const query: any[] = [
        { $match: matchFilter },
        { $project: { "victim.ship_id": 1 } },
        {
            $group: {
                _id: "$victim.ship_id",
                count: { $sum: 1 },
            },
        },
        { $sort: { count: -1, _id: 1 } },
        { $limit: limit },
        {
            $project: {
                id: "$_id",
                count: 1,
                _id: 0,
            },
        },
    ];

    // Determine optimal index hint for the aggregation pipeline
    const hint = await determineOptimalAggregationHint(
        Killmails.collection,
        query,
        "[Stats Ships API]"
    );

    let aggregation = Killmails.aggregate(query, {
        allowDiskUse: true,
    });

    // Apply index hint if we have one
    if (hint) {
        aggregation = aggregation.hint(hint);
    }

    const results = await aggregation;

    // Batch load ship data
    const shipIds = results.map((result) => result.id);
    const ships = await InvTypes.find(
        { type_id: { $in: shipIds } },
        { type_id: 1, name: 1, _id: 0 }
    ).lean();

    // Create a map for faster lookups
    const shipMap = new Map();
    ships.forEach((ship) => {
        shipMap.set(ship.type_id, ship.name);
    });

    // Map results with ship names
    return results.map((ship) => ({
        type_id: ship.id,
        name: shipMap.get(ship.id) || "Unknown",
        count: ship.count,
    }));
}

export default defineCachedEventHandler(
    async (event) => {
        const query = getQuery(event);

        // Parse dates if provided
        const dateFrom = query.from ? new Date(query.from as string) : null;
        const dateTo = query.to ? new Date(query.to as string) : null;
        const limit = query.limit ? parseInt(query.limit as string, 10) : 10;

        // Validate dates
        if (dateFrom && isNaN(dateFrom.getTime())) {
            throw createError({
                statusCode: 400,
                statusMessage:
                    "Invalid 'from' date format. Use ISO 8601 format (YYYY-MM-DDTHH:mm:ss.sssZ)",
            });
        }

        if (dateTo && isNaN(dateTo.getTime())) {
            throw createError({
                statusCode: 400,
                statusMessage:
                    "Invalid 'to' date format. Use ISO 8601 format (YYYY-MM-DDTHH:mm:ss.sssZ)",
            });
        }

        // Validate limit
        if (limit < 1 || limit > 100) {
            throw createError({
                statusCode: 400,
                statusMessage: "Limit must be between 1 and 100",
            });
        }

        try {
            const results = await topLostShips(dateFrom, dateTo, limit);

            return {
                success: true,
                data: results,
                meta: {
                    from:
                        dateFrom?.toISOString() ||
                        new Date(
                            Date.now() - 7 * 24 * 60 * 60 * 1000
                        ).toISOString(),
                    to: dateTo?.toISOString() || new Date().toISOString(),
                    limit,
                    count: results.length,
                },
            };
        } catch (error) {
            console.error("Error fetching ship loss statistics:", error);
            throw createError({
                statusCode: 500,
                statusMessage:
                    "Internal server error while fetching ship loss statistics",
            });
        }
    },
    {
        maxAge: 3600,
        staleMaxAge: -1,
        swr: true,
        getKey: (event) => {
            const query = getQuery(event);
            const dateFrom = query.from ? (query.from as string) : "";
            const dateTo = query.to ? (query.to as string) : "";
            const limit = query.limit ? (query.limit as string) : "10";
            return `stats:ships:lost:from:${dateFrom}:to:${dateTo}:limit:${limit}`;
        },
    }
);
