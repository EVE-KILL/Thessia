import { createHash } from "crypto";

// Define interfaces for character data
interface CharacterScanStats {
    killsLastWeek: number;
    isPotentiallyDangerous: boolean;
}

interface CharacterWithStats {
    name: string;
    character_id?: number;
    stats: CharacterScanStats;
}

// Constants for validation limits
const MAX_LINE_LENGTH = 64;
const MAX_LINES = 4096;

export default defineEventHandler(async (event) => {
    try {
        const characterNames = await readBody(event);

        if (!Array.isArray(characterNames) || characterNames.length === 0) {
            throw createError({
                statusCode: 400,
                message: "No valid character names provided",
            });
        }

        // Validate line count
        if (characterNames.length > MAX_LINES) {
            throw createError({
                statusCode: 400,
                message: `Too many character names. Maximum allowed is ${MAX_LINES}`,
            });
        }

        // Filter out names that are too long
        const validNames = characterNames.filter(
            (name) =>
                typeof name === "string" &&
                name.trim().length > 0 &&
                name.trim().length <= MAX_LINE_LENGTH
        );

        if (validNames.length === 0) {
            throw createError({
                statusCode: 400,
                message: "No valid character names found after filtering",
            });
        }

        const returnData: {
            alliances: Record<
                number,
                {
                    name: string;
                    ticker?: string;
                    corporations: Record<
                        number,
                        {
                            name: string;
                            ticker?: string;
                            characters: CharacterWithStats[];
                        }
                    >;
                }
            >;
            corporations: Record<
                number,
                {
                    name: string;
                    ticker?: string;
                    characters: CharacterWithStats[];
                }
            >;
            hash?: string;
        } = {
            alliances: {},
            corporations: {},
        };

        // Process each character name in parallel
        const characterProcessingPromises = validNames.map(
            async (characterNameInput) => {
                const trimmedName = String(characterNameInput).trim();
                if (!trimmedName) return null;

                // Simplified direct lookup by name - no regex
                const character = await Characters.findOne({
                    name: trimmedName,
                }).lean();
                if (!character || !character.character_id) return null;

                let killsInLastWeek = 0;

                try {
                    const sevenDaysAgo = new Date(
                        Date.now() - 7 * 24 * 60 * 60 * 1000
                    );
                    killsInLastWeek = await Killmails.countDocuments({
                        "attackers.character_id": character.character_id,
                        kill_time: { $gte: sevenDaysAgo },
                    });
                } catch (error) {
                    console.error(
                        `Error fetching kills for ${character.name}:`,
                        error
                    );
                    killsInLastWeek = 0;
                }

                const isPotentiallyDangerous = killsInLastWeek > 5;

                const characterDataWithStats: CharacterWithStats = {
                    name: character.name,
                    character_id: character.character_id,
                    stats: {
                        killsLastWeek: killsInLastWeek,
                        isPotentiallyDangerous: isPotentiallyDangerous,
                    },
                };

                let corporation = null;
                if (character.corporation_id) {
                    corporation = await Corporations.findOne({
                        corporation_id: character.corporation_id,
                    }).lean();
                }

                let alliance = null;
                if (character.alliance_id && character.alliance_id > 0) {
                    alliance = await Alliances.findOne({
                        alliance_id: character.alliance_id,
                    }).lean();
                }

                return {
                    characterDoc: character,
                    corporationDoc: corporation,
                    allianceDoc: alliance,
                    characterDataWithStats,
                };
            }
        );

        const processedCharacterDataArray = await Promise.all(
            characterProcessingPromises
        );
        // Filter out null values to handle cases where no matching character was found
        const validProcessedData = processedCharacterDataArray.filter(Boolean);

        if (validProcessedData.length === 0) {
            throw createError({
                statusCode: 404,
                message: "No valid characters found in EVE database",
            });
        }

        for (const processedData of validProcessedData) {
            const {
                characterDoc,
                corporationDoc,
                allianceDoc,
                characterDataWithStats,
            } = processedData;

            if (characterDoc.corporation_id) {
                if (characterDoc.alliance_id && characterDoc.alliance_id > 0) {
                    if (!returnData.alliances[characterDoc.alliance_id]) {
                        returnData.alliances[characterDoc.alliance_id] = {
                            name: allianceDoc?.name || "Unknown Alliance",
                            ticker: allianceDoc?.ticker,
                            corporations: {},
                        };
                    }

                    if (
                        !returnData.alliances[characterDoc.alliance_id]
                            .corporations[characterDoc.corporation_id]
                    ) {
                        returnData.alliances[
                            characterDoc.alliance_id
                        ].corporations[characterDoc.corporation_id] = {
                            name: corporationDoc?.name || "Unknown Corporation",
                            ticker: corporationDoc?.ticker,
                            characters: [],
                        };
                    }
                    returnData.alliances[characterDoc.alliance_id].corporations[
                        characterDoc.corporation_id
                    ].characters.push(characterDataWithStats);
                } else {
                    if (!returnData.corporations[characterDoc.corporation_id]) {
                        returnData.corporations[characterDoc.corporation_id] = {
                            name: corporationDoc?.name || "Unknown Corporation",
                            ticker: corporationDoc?.ticker,
                            characters: [],
                        };
                    }
                    returnData.corporations[
                        characterDoc.corporation_id
                    ].characters.push(characterDataWithStats);
                }
            }
        }

        const hash = createHash("sha256")
            .update(JSON.stringify(returnData))
            .digest("hex");
        returnData.hash = hash;

        // Save to database
        await LocalScan.findOneAndUpdate({ hash }, returnData, {
            upsert: true,
            new: true,
        });

        return returnData;
    } catch (error) {
        console.error("Error processing LocalScan:", error);
        // Ensure error is an instance of Error for statusCode and message
        const err = error instanceof Error ? error : new Error(String(error));
        throw createError({
            statusCode: (err as any).statusCode || 500,
            message: err.message || "Failed to process LocalScan data",
        });
    }
});
