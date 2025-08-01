export default defineEventHandler(async (event) => {
    try {
        const { systemIds, startTime, endTime } = await readBody(event);

        // Validate required parameters
        if (!systemIds || !Array.isArray(systemIds) || systemIds.length === 0) {
            throw createError({
                statusCode: 400,
                statusMessage:
                    "apiErrors.customBattles.entities.systemIdRequired",
            });
        }

        // Enforce maximum system limit
        if (systemIds.length > 5) {
            throw createError({
                statusCode: 400,
                statusMessage: "apiErrors.customBattles.entities.maxSystems",
            });
        }

        if (!startTime) {
            throw createError({
                statusCode: 400,
                statusMessage:
                    "apiErrors.customBattles.entities.startTimeRequired",
            });
        }
        if (!endTime) {
            throw createError({
                statusCode: 400,
                statusMessage:
                    "apiErrors.customBattles.entities.endTimeRequired",
            });
        }

        // Check if the timespan is within the allowed limit (36 hours)
        const startTimeDate = new Date(startTime);
        const endTimeDate = new Date(endTime);
        const timeDiffMs = endTimeDate.getTime() - startTimeDate.getTime();
        const maxTimespan = 36 * 60 * 60 * 1000; // 36 hours in milliseconds

        if (timeDiffMs > maxTimespan) {
            throw createError({
                statusCode: 400,
                statusMessage: "apiErrors.customBattles.entities.maxTimespan",
            });
        }

        // Query killmails within any of the specified systems and time range
        const killmails = await Killmails.find({
            system_id: { $in: systemIds }, // Use $in operator to match any of the provided system IDs
            kill_time: {
                $gte: new Date(startTime),
                $lte: new Date(endTime),
            },
        }).lean();

        // Aggregate unique alliances and corporations
        const alliances = new Map();
        const corporations = new Map();

        // Process each killmail
        for (const killmail of killmails) {
            // Process victim
            if (killmail.victim) {
                // Add victim alliance if it exists
                if (
                    killmail.victim.alliance_id &&
                    killmail.victim.alliance_name
                ) {
                    alliances.set(killmail.victim.alliance_id, {
                        id: killmail.victim.alliance_id,
                        name: killmail.victim.alliance_name,
                    });
                }

                // Add victim corporation if it exists
                if (
                    killmail.victim.corporation_id &&
                    killmail.victim.corporation_name
                ) {
                    corporations.set(killmail.victim.corporation_id, {
                        id: killmail.victim.corporation_id,
                        name: killmail.victim.corporation_name,
                        alliance_id: killmail.victim.alliance_id || null,
                        alliance_name: killmail.victim.alliance_name || null,
                    });
                }
            }

            // Process attackers
            if (killmail.attackers && Array.isArray(killmail.attackers)) {
                for (const attacker of killmail.attackers) {
                    // Add attacker alliance if it exists
                    if (attacker.alliance_id && attacker.alliance_name) {
                        alliances.set(attacker.alliance_id, {
                            id: attacker.alliance_id,
                            name: attacker.alliance_name,
                        });
                    }

                    // Add attacker corporation if it exists
                    if (attacker.corporation_id && attacker.corporation_name) {
                        corporations.set(attacker.corporation_id, {
                            id: attacker.corporation_id,
                            name: attacker.corporation_name,
                            alliance_id: attacker.alliance_id || null,
                            alliance_name: attacker.alliance_name || null,
                        });
                    }
                }
            }
        }

        // Convert Maps to Arrays
        const alliancesArray = Array.from(alliances.values());
        const corporationsArray = Array.from(corporations.values());

        return {
            alliances: alliancesArray,
            corporations: corporationsArray,
        };
    } catch (error: any) {
        console.error("Error in battles/entities endpoint:", error);
        // If statusMessage is already a key (e.g. from a previous createError), use it.
        // Otherwise, use the generic internal server error key.
        const messageIsKey =
            typeof error.statusMessage === "string" &&
            error.statusMessage.startsWith("apiErrors.");
        throw createError({
            statusCode: error.statusCode || 500,
            statusMessage: messageIsKey
                ? error.statusMessage
                : "apiErrors.customBattles.entities.internalServerError",
        });
    }
});
