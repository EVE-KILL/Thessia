import { createHash } from 'crypto';
import { calculateShortStats } from '~/server/helpers/Stats';
import { Alliances } from '~/server/models/Alliances'; // Assuming Alliances model
import { Characters } from '~/server/models/Characters'; // Assuming Characters model
import { Corporations } from '~/server/models/Corporations'; // Assuming Corporations model
import { Killmails } from '~/server/models/Killmails'; // Assuming Killmails model is exported like this
import { LocalScan } from '~/server/models/LocalScan'; // Assuming LocalScan model

// Define interfaces for the stats and character data
interface ShortStats {
    kills: number;
    losses: number;
    iskKilled: number;
    iskLost: number;
    npcLosses: number;
    soloKills: number;
    soloLosses: number;
    lastActive: Date | null;
}

interface CharacterScanStats {
    shortStats: ShortStats;
    killsLastWeek: number;
    isPotentiallyDangerous: boolean;
}

interface CharacterWithStats {
    name: string;
    character_id?: number; // Include character_id for potential future use
    stats: CharacterScanStats;
}

function escapeRegExp(string: string): string {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // $& means the whole matched string
}

export default defineEventHandler(async (event) => {
    try {
        const characterNames = await readBody(event);

        if (!Array.isArray(characterNames) || characterNames.length === 0) {
            throw createError({
                statusCode: 400,
                message: 'No valid character names provided'
            });
        }

        const returnData: {
            alliances: Record<number, {
                name: string;
                ticker?: string;
                corporations: Record<number, {
                    name: string;
                    ticker?: string;
                    characters: CharacterWithStats[];
                }>;
            }>,
            corporations: Record<number, {
                name: string;
                ticker?: string;
                characters: CharacterWithStats[];
            }>,
            hash?: string
        } = {
            alliances: {},
            corporations: {}
        };

        // Process each character name in parallel
        const characterProcessingPromises = characterNames.map(async (characterNameInput) => {
            const originalTrimmedName = String(characterNameInput).trim();
            if (!originalTrimmedName) return null;

            const nameForQueryPurposes = originalTrimmedName.replace(/[^\w\s.-]/g, '');
            if (!nameForQueryPurposes) return null;

            let query;
            if (originalTrimmedName === nameForQueryPurposes) {
                // Case-sensitive exact match
                query = { name: originalTrimmedName };
            } else {
                // Case-insensitive exact match on the sanitized name
                query = { name: { $regex: `^${escapeRegExp(nameForQueryPurposes)}$`, $options: 'i' } };
            }

            const character = await Characters.findOne(query).lean();
            if (!character || !character.character_id) return null;

            let shortStatsData: ShortStats;
            let killsInLastWeek = 0;

            try {
                // @ts-ignore TODO: Fix type for calculateShortStats if it expects days
                shortStatsData = await calculateShortStats('character_id', character.character_id, 7) as ShortStats;

                const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
                killsInLastWeek = await Killmails.countDocuments({
                    'attackers.character_id': character.character_id,
                    kill_time: { $gte: sevenDaysAgo }
                });
            } catch (statError) {
                console.error(`Error fetching stats for ${character.name}:`, statError);
                shortStatsData = {
                    kills: 0, losses: 0, iskKilled: 0, iskLost: 0, npcLosses: 0,
                    soloKills: 0, soloLosses: 0, lastActive: null
                };
                killsInLastWeek = 0;
            }

            const isPotentiallyDangerous = killsInLastWeek > 5;

            const characterDataWithStats: CharacterWithStats = {
                name: character.name,
                character_id: character.character_id,
                stats: {
                    shortStats: shortStatsData,
                    killsLastWeek: killsInLastWeek,
                    isPotentiallyDangerous: isPotentiallyDangerous
                }
            };

            let corporation = null;
            if (character.corporation_id) {
                corporation = await Corporations.findOne({ corporation_id: character.corporation_id }).lean();
            }

            let alliance = null;
            if (character.alliance_id && character.alliance_id > 0) {
                alliance = await Alliances.findOne({ alliance_id: character.alliance_id }).lean();
            }

            return {
                characterDoc: character,
                corporationDoc: corporation,
                allianceDoc: alliance,
                characterDataWithStats
            };
        });

        const processedCharacterDataArray = await Promise.all(characterProcessingPromises);

        for (const processedData of processedCharacterDataArray) {
            if (!processedData) continue;

            const { characterDoc, corporationDoc, allianceDoc, characterDataWithStats } = processedData;

            if (characterDoc.corporation_id) {
                if (characterDoc.alliance_id && characterDoc.alliance_id > 0) {
                    if (!returnData.alliances[characterDoc.alliance_id]) {
                        returnData.alliances[characterDoc.alliance_id] = {
                            name: allianceDoc?.name || 'Unknown Alliance',
                            ticker: allianceDoc?.ticker,
                            corporations: {}
                        };
                    }

                    if (!returnData.alliances[characterDoc.alliance_id].corporations[characterDoc.corporation_id]) {
                        returnData.alliances[characterDoc.alliance_id].corporations[characterDoc.corporation_id] = {
                            name: corporationDoc?.name || 'Unknown Corporation',
                            ticker: corporationDoc?.ticker,
                            characters: []
                        };
                    }
                    returnData.alliances[characterDoc.alliance_id].corporations[characterDoc.corporation_id].characters.push(characterDataWithStats);
                } else {
                    if (!returnData.corporations[characterDoc.corporation_id]) {
                        returnData.corporations[characterDoc.corporation_id] = {
                            name: corporationDoc?.name || 'Unknown Corporation',
                            ticker: corporationDoc?.ticker,
                            characters: []
                        };
                    }
                    returnData.corporations[characterDoc.corporation_id].characters.push(characterDataWithStats);
                }
            }
        }

        const hash = createHash('sha256').update(JSON.stringify(returnData)).digest('hex');
        returnData.hash = hash;

        // Save to database
        await LocalScan.findOneAndUpdate(
            { hash },
            returnData,
            { upsert: true, new: true }
        );

        return returnData;
    } catch (error) {
        console.error('Error processing LocalScan:', error);
        // Ensure error is an instance of Error for statusCode and message
        const err = error instanceof Error ? error : new Error(String(error));
        throw createError({
            statusCode: (err as any).statusCode || 500,
            message: err.message || 'Failed to process LocalScan data'
        });
    }
});
