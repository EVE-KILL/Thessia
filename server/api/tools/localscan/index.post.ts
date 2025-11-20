import prisma from "~/lib/prisma";
import { CharacterService, CorporationService, AllianceService } from "~/server/services";

interface CharacterScanStats {
    killsLastWeek: number;
    isPotentiallyDangerous: boolean;
}

interface CharacterWithStats {
    name: string;
    character_id?: number;
    stats: CharacterScanStats;
}

const MAX_LINE_LENGTH = 64;
const MAX_LINES = 4096;

export default defineEventHandler(async (event) => {
    const characterNames = await readBody(event);

    if (!Array.isArray(characterNames) || characterNames.length === 0) {
        throw createError({
            statusCode: 400,
            message: "No valid character names provided",
        });
    }

    if (characterNames.length > MAX_LINES) {
        throw createError({
            statusCode: 400,
            message: `Too many character names. Maximum allowed is ${MAX_LINES}`,
        });
    }

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
                    { name: string; ticker?: string; characters: CharacterWithStats[] }
                >;
            }
        >;
        corporations: Record<
            number,
            { name: string; ticker?: string; characters: CharacterWithStats[] }
        >;
    } = { alliances: {}, corporations: {} };

    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const characterProcessingPromises = validNames.map(async (characterNameInput) => {
        const trimmedName = String(characterNameInput).trim();
        if (!trimmedName) return null;

        const character = await prisma.character.findFirst({
            where: { name: { equals: trimmedName, mode: "insensitive" } },
        });
        if (!character || !character.character_id) return null;

        const killsInLastWeek = await prisma.killmail.count({
            where: {
                attackers: { some: { character_id: character.character_id } },
                killmail_time: { gte: sevenDaysAgo },
            },
        });

        const characterDataWithStats: CharacterWithStats = {
            name: character.name || trimmedName,
            character_id: character.character_id,
            stats: {
                killsLastWeek,
                isPotentiallyDangerous: killsInLastWeek > 5,
            },
        };

        const corporation = character.corporation_id
            ? await CorporationService.findById(character.corporation_id)
            : null;
        const alliance = character.alliance_id
            ? await AllianceService.findById(character.alliance_id)
            : null;

        return {
            character,
            corporation,
            alliance,
            characterDataWithStats,
        };
    });

    const processed = (await Promise.all(characterProcessingPromises)).filter(Boolean) as any[];

    if (!processed.length) {
        throw createError({
            statusCode: 404,
            message: "No valid characters found in EVE database",
        });
    }

    for (const entry of processed) {
        const { character, corporation, alliance, characterDataWithStats } = entry;

        if (character.corporation_id) {
            if (character.alliance_id && alliance) {
                if (!returnData.alliances[character.alliance_id]) {
                    returnData.alliances[character.alliance_id] = {
                        name: alliance.name || "Unknown Alliance",
                        ticker: alliance.ticker || undefined,
                        corporations: {},
                    };
                }
                const allianceCorps = returnData.alliances[character.alliance_id].corporations;
                if (!allianceCorps[character.corporation_id]) {
                    allianceCorps[character.corporation_id] = {
                        name: corporation?.name || "Unknown Corporation",
                        ticker: corporation?.ticker || undefined,
                        characters: [],
                    };
                }
                allianceCorps[character.corporation_id].characters.push(characterDataWithStats);
            } else {
                if (!returnData.corporations[character.corporation_id]) {
                    returnData.corporations[character.corporation_id] = {
                        name: corporation?.name || "Unknown Corporation",
                        ticker: corporation?.ticker || undefined,
                        characters: [],
                    };
                }
                returnData.corporations[character.corporation_id].characters.push(
                    characterDataWithStats
                );
            }
        }
    }

    return returnData;
});
