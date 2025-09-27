import { createHash } from "crypto";
import {
    AllianceService,
    CharacterService,
    CorporationService,
} from "~/server/services";

interface QueryParams {
    listType?: string;
    limit?: string;
    offset?: string;
}

interface CharacterAchievementResult {
    character_id: number;
    total_points: number;
    completed_achievements: number;
    total_achievements: number;
    last_calculated: Date;
}

interface CharacterResult {
    character_id: number;
    name: string;
    corporation_id?: number;
    alliance_id?: number;
}

interface CorporationResult {
    corporation_id: number;
    name: string;
}

interface AllianceResult {
    alliance_id: number;
    name: string;
}

export default defineCachedEventHandler(
    async (event) => {
        const query = getQuery(event) as QueryParams;
        const { listType, limit: limitStr, offset: offsetStr } = query;

        // Parameter Validation
        const validListTypes = [
            "highest_character_points",
            "lowest_character_points",
        ];
        if (!listType || !validListTypes.includes(listType)) {
            event.node.res.statusCode = 400;
            return {
                error: `Invalid or missing listType. Must be one of: ${validListTypes.join(
                    ", "
                )}.`,
            };
        }

        const limit = limitStr ? parseInt(limitStr, 10) : 10;
        const offset = offsetStr ? parseInt(offsetStr, 10) : 0;

        if (isNaN(limit) || limit <= 0 || limit > 100) {
            event.node.res.statusCode = 400;
            return {
                error: "Invalid limit. Must be a positive integer less than or equal to 100.",
            };
        }
        if (isNaN(offset) || offset < 0) {
            event.node.res.statusCode = 400;
            return { error: "Invalid offset. Must be a non-negative integer." };
        }

        try {
            // Determine sort order
            let sortQuery: any = {};
            let mongoQuery: any = {};

            switch (listType) {
                case "highest_character_points":
                    sortQuery = { total_points: -1 };
                    // For highest points, we might want to exclude 0 or negative
                    mongoQuery = { total_points: { $gt: 0 } };
                    break;
                case "lowest_character_points":
                    sortQuery = { total_points: 1 };
                    // For lowest points, include all values including negative
                    mongoQuery = {};
                    break;
            }

            // Get character achievements with character info
            const topCharacters = (await CharacterAchievements.find(mongoQuery)
                .hint({ total_points: -1 })
                .sort(sortQuery)
                .skip(offset)
                .limit(limit)
                .select(
                    "character_id total_points completed_achievements total_achievements last_calculated"
                )
                .lean()) as CharacterAchievementResult[];

            if (topCharacters.length === 0) {
                return [];
            }

            // Get character details for the top characters
            const characterIds = topCharacters.map(
                (char: CharacterAchievementResult) => char.character_id
            );
            const characterDetails = await CharacterService.findManyByIds(
                characterIds
            );

            // Get unique corporation and alliance IDs (filter nulls)
            const corporationIds = [
                ...new Set(
                    characterDetails
                        .map((char) => char.corporation_id)
                        .filter((id): id is number => id !== null && id > 0)
                ),
            ];
            const allianceIds = [
                ...new Set(
                    characterDetails
                        .map((char) => char.alliance_id)
                        .filter((id): id is number => id !== null && id > 0)
                ),
            ];

            // Fetch corporation and alliance names
            const [corporationDetails, allianceDetails] = await Promise.all([
                corporationIds.length > 0
                    ? CorporationService.findByIds(corporationIds)
                    : Promise.resolve([]),
                allianceIds.length > 0
                    ? AllianceService.findByIds(allianceIds)
                    : Promise.resolve([]),
            ]);

            // Create maps for quick lookup
            const characterMap = new Map(
                characterDetails.map((char) => [char.character_id, char])
            );
            const corporationMap = new Map(
                corporationDetails.map((corp) => [
                    corp.corporation_id,
                    corp.name,
                ])
            );
            const allianceMap = new Map(
                allianceDetails.map((alliance) => [
                    alliance.alliance_id,
                    alliance.name,
                ])
            );

            // Format response
            const finalResponse = topCharacters.map(
                (achievement: CharacterAchievementResult) => {
                    const character = characterMap.get(
                        achievement.character_id
                    );
                    return {
                        character_id: achievement.character_id,
                        character_name: character?.name || "Unknown",
                        corporation_id: character?.corporation_id || null,
                        corporation_name: character?.corporation_id
                            ? corporationMap.get(character.corporation_id) ||
                              "Unknown"
                            : "Unknown",
                        alliance_id: character?.alliance_id || null,
                        alliance_name: character?.alliance_id
                            ? allianceMap.get(character.alliance_id) ||
                              "Unknown"
                            : "Unknown",
                        total_points: achievement.total_points,
                        completed_achievements:
                            achievement.completed_achievements,
                        total_achievements: achievement.total_achievements,
                        completion_percentage:
                            achievement.total_achievements > 0
                                ? Math.round(
                                      (achievement.completed_achievements /
                                          achievement.total_achievements) *
                                          100
                                  )
                                : 0,
                        last_calculated: achievement.last_calculated,
                    };
                }
            );

            return finalResponse;
        } catch (error) {
            console.error("API Error in /historicalstats/achievements:", error);
            event.node.res.statusCode = 500;
            return { error: "Internal Server Error" };
        }
    },
    {
        maxAge: 3600,
        staleMaxAge: -1,
        swr: true,
        base: "redis",
        getKey: (event) => {
            const query = getQuery(event) as QueryParams;
            const { listType, limit, offset } = query;

            // Create a hash of the parameters to avoid key length issues
            const keyContent = `${listType}:${limit}:${offset}`;
            const hash = createHash("sha256")
                .update(keyContent)
                .digest("hex")
                .substring(0, 16);

            return `hs:a:${hash}`;
        },
    }
);
