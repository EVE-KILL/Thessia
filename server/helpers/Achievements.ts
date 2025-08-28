import type { PipelineStage } from "mongoose";
import { CharacterAchievements } from "../models/CharacterAchievements";
import { Killmails } from "../models/Killmails";
import { achievementsCache } from "./RuntimeCache";

/**
 * Achievement definition interface
 */
export interface IAchievement {
    id: string;
    name: string;
    description: string;
    type: "pvp" | "pve" | "exploration" | "industry" | "special";
    points: number;
    pointsModifier: "positive" | "negative";
    rarity: "common" | "uncommon" | "rare" | "epic" | "legendary";
    icon?: string;
    category: string;
    query: PipelineStage[]; // Required - no more customFunction
    threshold?: number;
    isActive: boolean;
}

/**
 * Ship category definitions for optimized achievement generation
 */
const SHIP_CATEGORIES = {
    frigates: {
        name: "Frigates",
        group_ids: [324, 893, 25, 831, 237], // Assault, Covert Ops, Frigate, Interceptor, Stealth Bomber
        points: 25,
        thresholds: [10, 50, 100, 500, 1000],
    },
    destroyers: {
        name: "Destroyers",
        group_ids: [420, 541], // Destroyer, Interdictor
        points: 35,
        thresholds: [10, 25, 50, 250, 500],
    },
    cruisers: {
        name: "Cruisers",
        group_ids: [906, 26, 833, 358, 894, 832, 963], // Battlecruiser, Cruiser, Heavy Assault Cruiser, Heavy Interdictor, Logistics, Recon Ship, Strategic Cruiser
        points: 50,
        thresholds: [10, 25, 50, 200, 400],
    },
    battleships: {
        name: "Battleships",
        group_ids: [419, 540], // Battleship, Marauder
        points: 75,
        thresholds: [5, 10, 25, 100, 200],
    },
    capitals: {
        name: "Capital Ships",
        group_ids: [547, 485, 659, 30], // Carrier, Dreadnought, Supercarrier, Titan
        points: 500,
        thresholds: [1, 5, 10, 25, 50],
    },
    industrials: {
        name: "Industrial Ships",
        group_ids: [27, 898, 900, 513, 902], // Industrial, Mining Barge, Exhumer, Freighter, Jump Freighter
        points: 20,
        thresholds: [10, 50, 100, 500, 1000],
    },
};

/**
 * Core static achievements (optimized versions)
 */
export const coreAchievements: IAchievement[] = [
    // === GENERAL KILL ACHIEVEMENTS ===
    // === GENERAL KILL ACHIEVEMENTS ===
    {
        id: "babys_first_kill",
        name: "Baby's First Kill",
        description: "Get your very first kill on an enemy player.",
        type: "pvp",
        points: 5,
        pointsModifier: "positive",
        rarity: "common",
        category: "Combat",
        threshold: 1,
        isActive: true,
        query: [
            {
                $match: {
                    is_npc: false,
                    attackers: {
                        $elemMatch: {
                            character_id: "{{character_id}}",
                            final_blow: true,
                        },
                    },
                },
            },
            { $count: "total_kills" },
        ],
    },
    {
        id: "rookie_killer",
        name: "Rookie Killer",
        description: "Achieve 10 kills on enemy players.",
        type: "pvp",
        points: 15,
        pointsModifier: "positive",
        rarity: "common",
        category: "Combat",
        threshold: 10,
        isActive: true,
        query: [
            {
                $match: {
                    is_npc: false,
                    attackers: {
                        $elemMatch: {
                            character_id: "{{character_id}}",
                            final_blow: true,
                        },
                    },
                },
            },
            { $count: "total_kills" },
        ],
    },
    {
        id: "experienced_killer",
        name: "Experienced Killer",
        description: "Achieve 100 kills on enemy players.",
        type: "pvp",
        points: 50,
        pointsModifier: "positive",
        rarity: "uncommon",
        category: "Combat",
        threshold: 100,
        isActive: true,
        query: [
            {
                $match: {
                    is_npc: false,
                    attackers: {
                        $elemMatch: {
                            character_id: "{{character_id}}",
                            final_blow: true,
                        },
                    },
                },
            },
            { $count: "total_kills" },
        ],
    },
    {
        id: "veteran_killer",
        name: "Veteran Killer",
        description: "Achieve 1,000 kills on enemy players.",
        type: "pvp",
        points: 200,
        pointsModifier: "positive",
        rarity: "rare",
        category: "Combat",
        threshold: 1000,
        isActive: true,
        query: [
            {
                $match: {
                    is_npc: false,
                    attackers: {
                        $elemMatch: {
                            character_id: "{{character_id}}",
                            final_blow: true,
                        },
                    },
                },
            },
            { $count: "total_kills" },
        ],
    },

    // === SOLO KILL ACHIEVEMENTS ===
    {
        id: "solo_first_blood",
        name: "Solo First Blood",
        description: "Get your first solo kill on an enemy player.",
        type: "pvp",
        points: 10,
        pointsModifier: "positive",
        rarity: "common",
        category: "Combat",
        threshold: 1,
        isActive: true,
        query: [
            {
                $match: {
                    is_solo: true,
                    is_npc: false,
                    attackers: {
                        $elemMatch: {
                            character_id: "{{character_id}}",
                            final_blow: true,
                        },
                    },
                },
            },
            { $count: "solo_kills" },
        ],
    },

    // === HIGH VALUE ACHIEVEMENTS ===
    {
        id: "bling_hunter",
        name: "Bling Hunter",
        description: "Kill someone worth at least 1 billion ISK.",
        type: "pvp",
        points: 100,
        pointsModifier: "positive",
        rarity: "uncommon",
        category: "High Value Targets",
        threshold: 1,
        isActive: true,
        query: [
            {
                $match: {
                    is_npc: false,
                    total_value: { $gte: 1000000000 },
                    attackers: {
                        $elemMatch: {
                            character_id: "{{character_id}}",
                            final_blow: true,
                        },
                    },
                },
            },
            { $count: "high_value_kills" },
        ],
    },

    // === LOCATION ACHIEVEMENTS ===
    {
        id: "highsec_hunter",
        name: "Highsec Hunter",
        description: "Kill someone in high security space.",
        type: "pvp",
        points: 15,
        pointsModifier: "positive",
        rarity: "common",
        category: "Locations",
        threshold: 1,
        isActive: true,
        query: [
            {
                $match: {
                    is_npc: false,
                    system_security: { $gte: 0.5 },
                    attackers: {
                        $elemMatch: {
                            character_id: "{{character_id}}",
                            final_blow: true,
                        },
                    },
                },
            },
            { $count: "highsec_kills" },
        ],
    },

    {
        id: "lowsec_prowler",
        name: "Lowsec Prowler",
        description: "Kill someone in low security space.",
        type: "pvp",
        points: 25,
        pointsModifier: "positive",
        rarity: "common",
        category: "Locations",
        threshold: 1,
        isActive: true,
        query: [
            {
                $match: {
                    is_npc: false,
                    system_security: { $gt: 0, $lt: 0.5 },
                    attackers: {
                        $elemMatch: {
                            character_id: "{{character_id}}",
                            final_blow: true,
                        },
                    },
                },
            },
            { $count: "lowsec_kills" },
        ],
    },

    {
        id: "nullsec_warrior",
        name: "Nullsec Warrior",
        description: "Kill someone in null security space.",
        type: "pvp",
        points: 30,
        pointsModifier: "positive",
        rarity: "common",
        category: "Locations",
        threshold: 1,
        isActive: true,
        query: [
            {
                $match: {
                    is_npc: false,
                    system_security: { $lte: 0 },
                    attackers: {
                        $elemMatch: {
                            character_id: "{{character_id}}",
                            final_blow: true,
                        },
                    },
                },
            },
            { $count: "nullsec_kills" },
        ],
    },
];

/**
 * Generate ship category achievements optimized for performance
 */
function generateShipCategoryAchievements(): IAchievement[] {
    const achievements: IAchievement[] = [];

    for (const [categoryKey, category] of Object.entries(SHIP_CATEGORIES)) {
        // Generate kill achievements for this ship category
        for (let i = 0; i < category.thresholds.length; i++) {
            const threshold = category.thresholds[i];
            const rarity =
                i === 0
                    ? "common"
                    : i === 1
                    ? "uncommon"
                    : i === 2
                    ? "rare"
                    : i === 3
                    ? "epic"
                    : "legendary";
            const points = category.points * (i + 1);

            achievements.push({
                id: `${categoryKey}_killer_${threshold}`,
                name: `${category.name} Killer ${
                    threshold > 1 ? `(${threshold})` : ""
                }`,
                description: `Destroy ${threshold} ${category.name.toLowerCase()}.`,
                type: "pvp",
                points: points,
                pointsModifier: "positive",
                rarity: rarity,
                category: "Ship Classes",
                threshold: threshold,
                isActive: true,
                query: [
                    {
                        $match: {
                            is_npc: false,
                            "victim.ship_group_id": { $in: category.group_ids },
                            attackers: {
                                $elemMatch: {
                                    character_id: "{{character_id}}",
                                    final_blow: true,
                                },
                            },
                        },
                    },
                    { $count: "ship_kills" },
                ],
            });
        }

        // Generate loss achievements for this ship category
        for (let i = 0; i < Math.min(2, category.thresholds.length); i++) {
            const threshold = category.thresholds[i];
            const rarity = i === 0 ? "common" : "uncommon";
            const points = Math.floor(category.points * 0.3) * (i + 1); // Loss achievements worth less

            achievements.push({
                id: `${categoryKey}_loser_${threshold}`,
                name: `${category.name} Sacrifice ${
                    threshold > 1 ? `(${threshold})` : ""
                }`,
                description: `Lose ${threshold} ${category.name.toLowerCase()}.`,
                type: "pvp",
                points: points,
                pointsModifier: "negative",
                rarity: rarity,
                category: "Ship Classes",
                threshold: threshold,
                isActive: true,
                query: [
                    {
                        $match: {
                            is_npc: false,
                            "victim.character_id": "{{character_id}}",
                            "victim.ship_group_id": { $in: category.group_ids },
                        },
                    },
                    { $count: "ship_losses" },
                ],
            });
        }
    }

    return achievements;
}

/**
 * Optimized Achievement Service
 */
export class AchievementService {
    /**
     * Get all achievements (static + generated ship category achievements)
     */
    private static async getAllAchievements(): Promise<IAchievement[]> {
        const cacheKey = "all_achievements";

        // Try cache first
        const cached = achievementsCache.get(cacheKey);
        if (cached) {
            return cached;
        }

        // Combine core achievements with generated ship achievements
        const shipAchievements = generateShipCategoryAchievements();
        const allAchievements = [...coreAchievements, ...shipAchievements];

        // Cache the result
        achievementsCache.set(cacheKey, allAchievements);

        return allAchievements;
    }

    /**
     * Build optimized faceted aggregation pipeline
     */
    private static buildOptimizedFacetedPipeline(
        achievements: IAchievement[],
        characterId: number
    ): PipelineStage[] {
        const facets: Record<string, any[]> = {};

        // Create facets for all achievements
        for (const achievement of achievements) {
            const facetKey = `achievement_${achievement.id}`;

            // Replace character ID placeholder in query
            let pipeline = this.replaceCharacterIdInQuery(
                achievement.query,
                characterId
            );

            facets[facetKey] = pipeline;
        }

        return [
            // Optimized initial match with projection
            {
                $match: {
                    $or: [
                        { "victim.character_id": characterId },
                        { "attackers.character_id": characterId },
                    ],
                    is_npc: false, // Most achievements ignore NPCs
                    kill_time: { $gte: new Date("2020-01-01") }, // Skip very old data for performance
                },
            },
            // Project only the fields we actually need
            {
                $project: {
                    killmail_id: 1,
                    is_npc: 1,
                    is_solo: 1,
                    kill_time: 1,
                    system_security: 1,
                    region_id: 1,
                    total_value: 1,
                    "victim.character_id": 1,
                    "victim.ship_group_id": 1,
                    "victim.ship_type_id": 1,
                    "attackers.character_id": 1,
                    "attackers.final_blow": 1,
                },
            },
            {
                $facet: facets,
            } as PipelineStage,
        ];
    }

    /**
     * Replace character ID placeholder in query
     */
    private static replaceCharacterIdInQuery(
        query: PipelineStage[],
        characterId: number
    ): PipelineStage[] {
        const queryString = JSON.stringify(query);
        const replacedString = queryString.replace(
            /"{{character_id}}"/g,
            characterId.toString()
        );
        return JSON.parse(replacedString);
    }

    /**
     * Calculate and update all achievements for a character
     */
    static async calculateAchievements(
        characterId: number,
        characterName?: string
    ) {
        // Quick activity check
        const hasActivity = await Killmails.countDocuments({
            $or: [
                { "victim.character_id": characterId },
                { "attackers.character_id": characterId },
            ],
        });

        // Get or create character record
        let characterRecord = await CharacterAchievements.findOne({
            character_id: characterId,
        });

        if (hasActivity === 0) {
            // No activity - initialize with empty achievements if needed
            if (!characterRecord) {
                const doc = new CharacterAchievements({
                    character_id: characterId,
                    character_name: characterName,
                    achievements: [],
                    total_achievements: 0,
                    completed_achievements: 0,
                    total_points: 0,
                });
                return await doc.save();
            }
            return characterRecord;
        }

        // Get all achievements
        const allAchievements = await this.getAllAchievements();
        const activeAchievements = allAchievements.filter((a) => a.isActive);

        // Create achievement lookup map
        const achievementLookup = new Map<string, IAchievement>();
        for (const achievement of activeAchievements) {
            achievementLookup.set(achievement.id, achievement);
        }

        // Initialize character record if needed
        if (!characterRecord) {
            const initialAchievements = activeAchievements.map(
                (achievement) => ({
                    achievement_id: achievement.id,
                    name: achievement.name,
                    description: achievement.description,
                    type: achievement.type,
                    points: achievement.points,
                    rarity: achievement.rarity,
                    category: achievement.category,
                    threshold: achievement.threshold || 1,
                    is_completed: false,
                    current_count: 0,
                    completion_tiers: 0,
                    completed_at: null,
                    last_updated: new Date(),
                })
            );

            characterRecord = new CharacterAchievements({
                character_id: characterId,
                character_name: characterName,
                achievements: initialAchievements,
                total_achievements: initialAchievements.length,
                completed_achievements: 0,
                total_points: 0,
            });

            await characterRecord.save();
        }

        // Build optimized faceted pipeline
        const pipeline = this.buildOptimizedFacetedPipeline(
            activeAchievements,
            characterId
        );

        const achievementResults: Record<
            string,
            { count: number; killmailIds: number[] }
        > = {};

        try {
            console.time("Faceted Aggregation");
            const facetResults = await Killmails.aggregate(pipeline, {
                allowDiskUse: true,
            });
            console.timeEnd("Faceted Aggregation");

            const [results] = facetResults;

            // Process faceted results
            for (const achievement of activeAchievements) {
                const facetKey = `achievement_${achievement.id}`;
                const facetResult = results[facetKey] || [];

                let count = 0;
                if (facetResult.length > 0) {
                    const resultKeys = Object.keys(facetResult[0]);
                    count =
                        resultKeys.length > 0
                            ? facetResult[0][resultKeys[0]!] || 0
                            : 0;
                }

                achievementResults[achievement.id] = { count, killmailIds: [] };
            }
        } catch (error) {
            console.error(
                `Error in optimized faceted aggregation for character ${characterId}:`,
                error
            );
            // Fall back to individual queries if needed
            for (const achievement of activeAchievements) {
                try {
                    const query = this.replaceCharacterIdInQuery(
                        achievement.query,
                        characterId
                    );
                    const queryResult = await Killmails.aggregate(query, {
                        allowDiskUse: true,
                    });
                    const count =
                        queryResult.length > 0 &&
                        Object.keys(queryResult[0]).length > 0
                            ? queryResult[0][Object.keys(queryResult[0])[0]!] ||
                              0
                            : 0;

                    achievementResults[achievement.id] = {
                        count,
                        killmailIds: [],
                    };
                } catch (individualError) {
                    console.error(
                        `Error calculating achievement ${achievement.id}:`,
                        individualError
                    );
                    achievementResults[achievement.id] = {
                        count: 0,
                        killmailIds: [],
                    };
                }
            }
        }

        // Apply updates
        const updates: any = {};
        let hasUpdates = false;

        for (const achievement of activeAchievements) {
            const result = achievementResults[achievement.id];
            if (!result) continue;

            const { count } = result;
            const existingIndex = characterRecord.achievements.findIndex(
                (a) => a.achievement_id === achievement.id
            );

            if (existingIndex >= 0) {
                const existing = characterRecord.achievements[existingIndex];
                if (existing) {
                    const wasCompleted = existing.is_completed;
                    const isCompleted = count >= (achievement.threshold || 1);
                    const newTiers = Math.floor(
                        count / (achievement.threshold || 1)
                    );
                    const oldTiers = existing.completion_tiers || 0;

                    if (
                        existing.current_count !== count ||
                        wasCompleted !== isCompleted ||
                        oldTiers !== newTiers
                    ) {
                        updates[`achievements.${existingIndex}.current_count`] =
                            count;
                        updates[`achievements.${existingIndex}.is_completed`] =
                            isCompleted;
                        updates[
                            `achievements.${existingIndex}.completion_tiers`
                        ] = newTiers;
                        updates[`achievements.${existingIndex}.last_updated`] =
                            new Date();

                        if (isCompleted && !wasCompleted) {
                            updates[
                                `achievements.${existingIndex}.completed_at`
                            ] = new Date();
                        }

                        hasUpdates = true;
                    }
                }
            } else {
                // New achievement that doesn't exist in character record - add it
                const isCompleted = count >= (achievement.threshold || 1);
                const completionTiers = Math.floor(
                    count / (achievement.threshold || 1)
                );
                
                const newAchievement = {
                    achievement_id: achievement.id,
                    name: achievement.name,
                    description: achievement.description,
                    type: achievement.type,
                    points: achievement.points,
                    rarity: achievement.rarity,
                    category: achievement.category,
                    threshold: achievement.threshold || 1,
                    current_count: count,
                    is_completed: isCompleted,
                    completion_tiers: completionTiers,
                    completed_at: isCompleted ? new Date() : null,
                    last_updated: new Date(),
                };
                
                updates[`$push`] = updates[`$push`] || {};
                updates[`$push`].achievements = updates[`$push`].achievements || { $each: [] };
                updates[`$push`].achievements.$each.push(newAchievement);
                
                hasUpdates = true;
            }
        }

        // Save updates if any
        if (hasUpdates) {
            // Separate $set and $push operations
            const setOperations: any = {};
            const pushOperations: any = updates.$push;
            
            // Move non-$push operations to setOperations
            for (const [key, value] of Object.entries(updates)) {
                if (key !== '$push') {
                    setOperations[key] = value;
                }
            }
            
            setOperations.character_name = characterName;
            setOperations.last_calculated = new Date();

            const updateOperations: any = { $set: setOperations };
            if (pushOperations) {
                updateOperations.$push = pushOperations;
            }

            await CharacterAchievements.updateOne(
                { character_id: characterId },
                updateOperations
            );

            // Recalculate totals
            const updatedRecord = await CharacterAchievements.findOne({
                character_id: characterId,
            });

            if (updatedRecord) {
                const completedAchievements = updatedRecord.achievements.filter(
                    (a) => a.is_completed
                );
                const totalPoints = updatedRecord.achievements.reduce(
                    (sum, achievement) => {
                        const basePoints =
                            achievement.points *
                            (achievement.completion_tiers || 0);
                        const achievementDef = achievementLookup.get(
                            achievement.achievement_id
                        );
                        const modifier =
                            achievementDef?.pointsModifier || "positive";
                        return (
                            sum +
                            (modifier === "negative" ? -basePoints : basePoints)
                        );
                    },
                    0
                );

                updatedRecord.total_achievements =
                    updatedRecord.achievements.length;
                updatedRecord.completed_achievements =
                    completedAchievements.length;
                updatedRecord.total_points = totalPoints;
                updatedRecord.last_calculated = new Date();

                await updatedRecord.save();
                return updatedRecord;
            }
        }

        return characterRecord;
    }

    /**
     * Get achievements for a character
     */
    static async getCharacterAchievements(characterId: number) {
        return await CharacterAchievements.findOne({
            character_id: characterId,
        });
    }

    /**
     * Get achievement leaderboard
     */
    static async getLeaderboard(limit: number = 100, offset: number = 0) {
        return await CharacterAchievements.find({})
            .sort({ total_points: -1, completed_achievements: -1 })
            .limit(limit)
            .skip(offset)
            .select(
                "character_id character_name total_points completed_achievements total_achievements last_calculated"
            );
    }

    /**
     * Get achievement statistics
     */
    static async getAchievementStats() {
        const stats = await CharacterAchievements.aggregate([
            {
                $group: {
                    _id: null,
                    total_characters: { $sum: 1 },
                    avg_points: { $avg: "$total_points" },
                    max_points: { $max: "$total_points" },
                    avg_completed: { $avg: "$completed_achievements" },
                    max_completed: { $max: "$completed_achievements" },
                },
            },
        ]);

        return (
            stats[0] || {
                total_characters: 0,
                avg_points: 0,
                max_points: 0,
                avg_completed: 0,
                max_completed: 0,
            }
        );
    }

    /**
     * Test single achievement for performance testing
     */
    static async testSingleAchievement(
        characterId: number,
        achievementId: string
    ) {
        const allAchievements = await this.getAllAchievements();
        const achievement = allAchievements.find((a) => a.id === achievementId);

        if (!achievement) {
            throw new Error(`Achievement ${achievementId} not found`);
        }

        // Execute the achievement query
        const result = await Killmails.aggregate([
            {
                $match: {
                    $or: [
                        { "victim.character_id": characterId },
                        { "attackers.character_id": characterId },
                    ],
                },
            },
            ...achievement.query,
        ]);

        return {
            achievementId,
            characterId,
            count: result[0]?.count || 0,
            threshold: achievement.threshold || 1,
            completed: (result[0]?.count || 0) >= (achievement.threshold || 1),
        };
    }
}

// Backward compatibility export
export const achievements = coreAchievements;
