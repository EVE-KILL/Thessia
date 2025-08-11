import { LRUCache } from "lru-cache";
import type { PipelineStage } from "mongoose";
import { CharacterAchievements } from "../models/CharacterAchievements";
import { InvGroups } from "../models/InvGroups";
import { Killmails } from "../models/Killmails";

// LRU cache for ship groups data (category_id: 6)
const shipGroupsCache = new LRUCache<string, any[]>({
    max: 10000,
    ttl: 1000 * 60 * 60, // 1 hour TTL
    allowStale: true,
});

/**
 * Get ship groups from cache or database
 */
async function getShipGroups(): Promise<any[]> {
    const cacheKey = "ship_groups_category_6";

    // Try to get from cache first
    const cached = shipGroupsCache.get(cacheKey);
    if (cached) {
        return cached;
    }

    // Fetch from database
    const shipGroups = await InvGroups.find({
        category_id: 6,
        published: true,
    }).lean();

    // Cache the result
    shipGroupsCache.set(cacheKey, shipGroups);

    return shipGroups;
}

/**
 * Achievement definition interface
 */
export interface IAchievement {
    id: string;
    name: string;
    description: string;
    type: "pvp" | "pve" | "exploration" | "industry" | "special";
    points: number;
    pointsModifier: "positive" | "negative"; // Whether points are added or subtracted from total score
    rarity: "common" | "uncommon" | "rare" | "epic" | "legendary";
    icon?: string;
    category: string;
    query?: PipelineStage[]; // Optional for temporal achievements with customFunction
    threshold?: number; // For achievements that require multiple occurrences
    temporal?: boolean; // Whether this achievement requires temporal logic (default: false)
    customFunction?: (
        characterId: number
    ) => Promise<number | { count: number; killmailIds: number[] }>; // Custom function to handle this achievement's logic
    isActive: boolean;
}

/**
 * All achievement queries are designed to work with a specific character_id parameter
 * The queries will be executed per character and should return a count and relevant metadata
 */
export const achievements: IAchievement[] = [
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
                    "attackers.character_id": "{{character_id}}",
                    "attackers.final_blow": true,
                },
            },
            {
                $count: "total_kills",
            },
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
                    "attackers.character_id": "{{character_id}}",
                    "attackers.final_blow": true,
                },
            },
            {
                $count: "total_kills",
            },
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
                    "attackers.character_id": "{{character_id}}",
                    "attackers.final_blow": true,
                },
            },
            {
                $count: "total_kills",
            },
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
                    "attackers.character_id": "{{character_id}}",
                    "attackers.final_blow": true,
                },
            },
            {
                $count: "total_kills",
            },
        ],
    },
    {
        id: "elite_killer",
        name: "Elite Killer",
        description: "Achieve 10,000 kills on enemy players.",
        type: "pvp",
        points: 750,
        pointsModifier: "positive",
        rarity: "epic",
        category: "Combat",
        threshold: 10000,
        isActive: true,
        query: [
            {
                $match: {
                    is_npc: false,
                    "attackers.character_id": "{{character_id}}",
                    "attackers.final_blow": true,
                },
            },
            {
                $count: "total_kills",
            },
        ],
    },
    {
        id: "legendary_killer",
        name: "Legendary Killer",
        description: "Achieve 100,000 kills on enemy players.",
        type: "pvp",
        points: 2500,
        pointsModifier: "positive",
        rarity: "legendary",
        category: "Combat",
        threshold: 100000,
        isActive: true,
        query: [
            {
                $match: {
                    is_npc: false,
                    "attackers.character_id": "{{character_id}}",
                    "attackers.final_blow": true,
                },
            },
            {
                $count: "total_kills",
            },
        ],
    },

    // === SOLO KILL ACHIEVEMENTS ===
    {
        id: "solo_killer",
        name: "Solo Killer",
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
                    "attackers.character_id": "{{character_id}}",
                    "attackers.final_blow": true,
                },
            },
            {
                $count: "solo_kills",
            },
        ],
    },
    {
        id: "solo_hunter",
        name: "Solo Hunter",
        description: "Achieve 100 solo kills on enemy players.",
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
                    is_solo: true,
                    is_npc: false,
                    "attackers.character_id": "{{character_id}}",
                    "attackers.final_blow": true,
                },
            },
            {
                $count: "solo_kills",
            },
        ],
    },
    {
        id: "solo_assassin",
        name: "Solo Assassin",
        description: "Achieve 1,000 solo kills on enemy players.",
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
                    is_solo: true,
                    is_npc: false,
                    "attackers.character_id": "{{character_id}}",
                    "attackers.final_blow": true,
                },
            },
            {
                $count: "solo_kills",
            },
        ],
    },
    {
        id: "solo_legend",
        name: "Solo Legend",
        description: "Achieve 10,000 solo kills on enemy players.",
        type: "pvp",
        points: 1000,
        pointsModifier: "positive",
        rarity: "legendary",
        category: "Combat",
        threshold: 10000,
        isActive: true,
        query: [
            {
                $match: {
                    is_solo: true,
                    is_npc: false,
                    "attackers.character_id": "{{character_id}}",
                    "attackers.final_blow": true,
                },
            },
            {
                $count: "solo_kills",
            },
        ],
    },

    // === LOSS ACHIEVEMENTS ===
    {
        id: "oh_no_first_loss",
        name: "Oh No, I Lost a Ship!",
        description: "Lose your first ship to enemy players.",
        type: "special",
        points: 5,
        pointsModifier: "negative",
        rarity: "common",
        category: "Learning Experience",
        threshold: 1,
        isActive: true,
        query: [
            {
                $match: {
                    is_npc: false,
                    "victim.character_id": "{{character_id}}",
                },
            },
            {
                $count: "total_losses",
            },
        ],
    },
    {
        id: "frequent_visitor",
        name: "Frequent Visitor",
        description: "Lose 10 ships to enemy players.",
        type: "special",
        points: 10,
        pointsModifier: "negative",
        rarity: "common",
        category: "Learning Experience",
        threshold: 10,
        isActive: true,
        query: [
            {
                $match: {
                    is_npc: false,
                    "victim.character_id": "{{character_id}}",
                },
            },
            {
                $count: "total_losses",
            },
        ],
    },
    {
        id: "seasoned_victim",
        name: "Seasoned Victim",
        description: "Lose 100 ships to enemy players.",
        type: "special",
        points: 25,
        pointsModifier: "negative",
        rarity: "uncommon",
        category: "Learning Experience",
        threshold: 100,
        isActive: true,
        query: [
            {
                $match: {
                    is_npc: false,
                    "victim.character_id": "{{character_id}}",
                },
            },
            {
                $count: "total_losses",
            },
        ],
    },
    {
        id: "professional_victim",
        name: "Professional Victim",
        description: "Lose 1,000 ships to enemy players.",
        type: "special",
        points: 100,
        pointsModifier: "negative",
        rarity: "rare",
        category: "Learning Experience",
        threshold: 1000,
        isActive: true,
        query: [
            {
                $match: {
                    is_npc: false,
                    "victim.character_id": "{{character_id}}",
                },
            },
            {
                $count: "total_losses",
            },
        ],
    },
    {
        id: "eternal_victim",
        name: "Eternal Victim",
        description: "Lose 10,000 ships to enemy players.",
        type: "special",
        points: 500,
        pointsModifier: "negative",
        rarity: "epic",
        category: "Learning Experience",
        threshold: 10000,
        isActive: true,
        query: [
            {
                $match: {
                    is_npc: false,
                    "victim.character_id": "{{character_id}}",
                },
            },
            {
                $count: "total_losses",
            },
        ],
    },
    {
        id: "legendary_victim",
        name: "Legendary Victim",
        description: "Lose 100,000 ships to enemy players.",
        type: "special",
        points: 2000,
        pointsModifier: "negative",
        rarity: "legendary",
        category: "Learning Experience",
        threshold: 100000,
        isActive: true,
        query: [
            {
                $match: {
                    is_npc: false,
                    "victim.character_id": "{{character_id}}",
                },
            },
            {
                $count: "total_losses",
            },
        ],
    },

    // === HIGHSEC ACHIEVEMENTS ===
    {
        id: "highsec_enforcer",
        name: "Highsec Enforcer",
        description: "Get your first kill in highsec space.",
        type: "pvp",
        points: 10,
        pointsModifier: "positive",
        rarity: "common",
        category: "Regional Combat",
        threshold: 1,
        isActive: true,
        query: [
            {
                $match: {
                    is_npc: false,
                    system_security: { $gte: 0.5 },
                    "attackers.character_id": "{{character_id}}",
                    "attackers.final_blow": true,
                },
            },
            {
                $count: "highsec_kills",
            },
        ],
    },
    {
        id: "highsec_veteran",
        name: "Highsec Veteran",
        description: "Achieve 100 kills in highsec space.",
        type: "pvp",
        points: 50,
        pointsModifier: "positive",
        rarity: "uncommon",
        category: "Regional Combat",
        threshold: 100,
        isActive: true,
        query: [
            {
                $match: {
                    is_npc: false,
                    system_security: { $gte: 0.5 },
                    "attackers.character_id": "{{character_id}}",
                    "attackers.final_blow": true,
                },
            },
            {
                $count: "highsec_kills",
            },
        ],
    },
    {
        id: "highsec_destroyer",
        name: "Highsec Destroyer",
        description: "Achieve 1,000 kills in highsec space.",
        type: "pvp",
        points: 200,
        pointsModifier: "positive",
        rarity: "rare",
        category: "Regional Combat",
        threshold: 1000,
        isActive: true,
        query: [
            {
                $match: {
                    is_npc: false,
                    system_security: { $gte: 0.5 },
                    "attackers.character_id": "{{character_id}}",
                    "attackers.final_blow": true,
                },
            },
            {
                $count: "highsec_kills",
            },
        ],
    },
    {
        id: "highsec_overlord",
        name: "Highsec Overlord",
        description: "Achieve 10,000 kills in highsec space.",
        type: "pvp",
        points: 1000,
        pointsModifier: "positive",
        rarity: "epic",
        category: "Regional Combat",
        threshold: 10000,
        isActive: true,
        query: [
            {
                $match: {
                    is_npc: false,
                    system_security: { $gte: 0.5 },
                    "attackers.character_id": "{{character_id}}",
                    "attackers.final_blow": true,
                },
            },
            {
                $count: "highsec_kills",
            },
        ],
    },
    {
        id: "highsec_emperor",
        name: "Highsec Emperor",
        description: "Achieve 100,000 kills in highsec space.",
        type: "pvp",
        points: 4000,
        pointsModifier: "positive",
        rarity: "legendary",
        category: "Regional Combat",
        threshold: 100000,
        isActive: true,
        query: [
            {
                $match: {
                    is_npc: false,
                    system_security: { $gte: 0.5 },
                    "attackers.character_id": "{{character_id}}",
                    "attackers.final_blow": true,
                },
            },
            {
                $count: "highsec_kills",
            },
        ],
    },

    // === LOWSEC ACHIEVEMENTS ===
    {
        id: "pirate_initiate",
        name: "You're a Pirate Now",
        description: "Get your first kill in lowsec space.",
        type: "pvp",
        points: 15,
        pointsModifier: "positive",
        rarity: "common",
        category: "Regional Combat",
        threshold: 1,
        isActive: true,
        query: [
            {
                $match: {
                    is_npc: false,
                    system_security: { $gt: 0.0, $lt: 0.5 },
                    "attackers.character_id": "{{character_id}}",
                    "attackers.final_blow": true,
                },
            },
            {
                $count: "lowsec_kills",
            },
        ],
    },
    {
        id: "lowsec_marauder",
        name: "Lowsec Marauder",
        description: "Achieve 100 kills in lowsec space.",
        type: "pvp",
        points: 75,
        pointsModifier: "positive",
        rarity: "uncommon",
        category: "Regional Combat",
        threshold: 100,
        isActive: true,
        query: [
            {
                $match: {
                    is_npc: false,
                    system_security: { $gt: 0.0, $lt: 0.5 },
                    "attackers.character_id": "{{character_id}}",
                    "attackers.final_blow": true,
                },
            },
            {
                $count: "lowsec_kills",
            },
        ],
    },
    {
        id: "lowsec_terror",
        name: "Lowsec Terror",
        description: "Achieve 1,000 kills in lowsec space.",
        type: "pvp",
        points: 300,
        pointsModifier: "positive",
        rarity: "rare",
        category: "Regional Combat",
        threshold: 1000,
        isActive: true,
        query: [
            {
                $match: {
                    is_npc: false,
                    system_security: { $gt: 0.0, $lt: 0.5 },
                    "attackers.character_id": "{{character_id}}",
                    "attackers.final_blow": true,
                },
            },
            {
                $count: "lowsec_kills",
            },
        ],
    },
    {
        id: "lowsec_warlord",
        name: "Lowsec Warlord",
        description: "Achieve 10,000 kills in lowsec space.",
        type: "pvp",
        points: 1500,
        pointsModifier: "positive",
        rarity: "epic",
        category: "Regional Combat",
        threshold: 10000,
        isActive: true,
        query: [
            {
                $match: {
                    is_npc: false,
                    system_security: { $gt: 0.0, $lt: 0.5 },
                    "attackers.character_id": "{{character_id}}",
                    "attackers.final_blow": true,
                },
            },
            {
                $count: "lowsec_kills",
            },
        ],
    },
    {
        id: "lowsec_pirate_king",
        name: "Lowsec Pirate King",
        description: "Achieve 100,000 kills in lowsec space.",
        type: "pvp",
        points: 6000,
        pointsModifier: "positive",
        rarity: "legendary",
        category: "Regional Combat",
        threshold: 100000,
        isActive: true,
        query: [
            {
                $match: {
                    is_npc: false,
                    system_security: { $gt: 0.0, $lt: 0.5 },
                    "attackers.character_id": "{{character_id}}",
                    "attackers.final_blow": true,
                },
            },
            {
                $count: "lowsec_kills",
            },
        ],
    },

    // === NULLSEC ACHIEVEMENTS ===
    {
        id: "nullsec_explorer",
        name: "Nullsec Explorer",
        description: "Get your first kill in nullsec space.",
        type: "pvp",
        points: 20,
        pointsModifier: "positive",
        rarity: "common",
        category: "Regional Combat",
        threshold: 1,
        isActive: true,
        query: [
            {
                $match: {
                    is_npc: false,
                    system_security: { $lte: 0.0 },
                    "attackers.character_id": "{{character_id}}",
                    "attackers.final_blow": true,
                },
            },
            {
                $count: "nullsec_kills",
            },
        ],
    },
    {
        id: "nullsec_warrior",
        name: "Nullsec Warrior",
        description: "Achieve 100 kills in nullsec space.",
        type: "pvp",
        points: 100,
        pointsModifier: "positive",
        rarity: "uncommon",
        category: "Regional Combat",
        threshold: 100,
        isActive: true,
        query: [
            {
                $match: {
                    is_npc: false,
                    system_security: { $lte: 0.0 },
                    "attackers.character_id": "{{character_id}}",
                    "attackers.final_blow": true,
                },
            },
            {
                $count: "nullsec_kills",
            },
        ],
    },
    {
        id: "nullsec_conqueror",
        name: "Nullsec Conqueror",
        description: "Achieve 1,000 kills in nullsec space.",
        type: "pvp",
        points: 400,
        pointsModifier: "positive",
        rarity: "rare",
        category: "Regional Combat",
        threshold: 1000,
        isActive: true,
        query: [
            {
                $match: {
                    is_npc: false,
                    system_security: { $lte: 0.0 },
                    "attackers.character_id": "{{character_id}}",
                    "attackers.final_blow": true,
                },
            },
            {
                $count: "nullsec_kills",
            },
        ],
    },
    {
        id: "nullsec_emperor",
        name: "Nullsec Emperor",
        description: "Achieve 10,000 kills in nullsec space.",
        type: "pvp",
        points: 2000,
        pointsModifier: "positive",
        rarity: "epic",
        category: "Regional Combat",
        threshold: 10000,
        isActive: true,
        query: [
            {
                $match: {
                    is_npc: false,
                    system_security: { $lte: 0.0 },
                    "attackers.character_id": "{{character_id}}",
                    "attackers.final_blow": true,
                },
            },
            {
                $count: "nullsec_kills",
            },
        ],
    },
    {
        id: "nullsec_god_emperor",
        name: "Nullsec God Emperor",
        description: "Achieve 100,000 kills in nullsec space.",
        type: "pvp",
        points: 8000,
        pointsModifier: "positive",
        rarity: "legendary",
        category: "Regional Combat",
        threshold: 100000,
        isActive: true,
        query: [
            {
                $match: {
                    is_npc: false,
                    system_security: { $lte: 0.0 },
                    "attackers.character_id": "{{character_id}}",
                    "attackers.final_blow": true,
                },
            },
            {
                $count: "nullsec_kills",
            },
        ],
    },

    // === WORMHOLE SPACE ACHIEVEMENTS ===
    {
        id: "wspace_pioneer",
        name: "Wormhole Pioneer",
        description: "Get your first kill in wormhole space.",
        type: "exploration",
        points: 25,
        pointsModifier: "positive",
        rarity: "uncommon",
        category: "Regional Combat",
        threshold: 1,
        isActive: true,
        query: [
            {
                $match: {
                    is_npc: false,
                    region_id: { $gte: 11000001, $lte: 11000033 },
                    "attackers.character_id": "{{character_id}}",
                    "attackers.final_blow": true,
                },
            },
            {
                $count: "wspace_kills",
            },
        ],
    },
    {
        id: "wspace_dweller",
        name: "Wormhole Dweller",
        description: "Achieve 100 kills in wormhole space.",
        type: "exploration",
        points: 125,
        pointsModifier: "positive",
        rarity: "rare",
        category: "Regional Combat",
        threshold: 100,
        isActive: true,
        query: [
            {
                $match: {
                    is_npc: false,
                    region_id: { $gte: 11000001, $lte: 11000033 },
                    "attackers.character_id": "{{character_id}}",
                    "attackers.final_blow": true,
                },
            },
            {
                $count: "wspace_kills",
            },
        ],
    },
    {
        id: "wspace_hunter",
        name: "Wormhole Hunter",
        description: "Achieve 1,000 kills in wormhole space.",
        type: "exploration",
        points: 500,
        pointsModifier: "positive",
        rarity: "epic",
        category: "Regional Combat",
        threshold: 1000,
        isActive: true,
        query: [
            {
                $match: {
                    is_npc: false,
                    region_id: { $gte: 11000001, $lte: 11000033 },
                    "attackers.character_id": "{{character_id}}",
                    "attackers.final_blow": true,
                },
            },
            {
                $count: "wspace_kills",
            },
        ],
    },
    {
        id: "wspace_master",
        name: "Wormhole Master",
        description: "Achieve 10,000 kills in wormhole space.",
        type: "exploration",
        points: 2500,
        pointsModifier: "positive",
        rarity: "legendary",
        category: "Regional Combat",
        threshold: 10000,
        isActive: true,
        query: [
            {
                $match: {
                    is_npc: false,
                    region_id: { $gte: 11000001, $lte: 11000033 },
                    "attackers.character_id": "{{character_id}}",
                    "attackers.final_blow": true,
                },
            },
            {
                $count: "wspace_kills",
            },
        ],
    },
    {
        id: "wspace_legend",
        name: "Wormhole Legend",
        description: "Achieve 100,000 kills in wormhole space.",
        type: "exploration",
        points: 10000,
        pointsModifier: "positive",
        rarity: "legendary",
        category: "Regional Combat",
        threshold: 100000,
        isActive: true,
        query: [
            {
                $match: {
                    is_npc: false,
                    region_id: { $gte: 11000001, $lte: 11000033 },
                    "attackers.character_id": "{{character_id}}",
                    "attackers.final_blow": true,
                },
            },
            {
                $count: "wspace_kills",
            },
        ],
    },

    // === POCHVEN ACHIEVEMENTS ===
    {
        id: "pochven_explorer",
        name: "Pochven Explorer",
        description: "Get your first kill in Pochven space.",
        type: "exploration",
        points: 30,
        pointsModifier: "positive",
        rarity: "rare",
        category: "Regional Combat",
        threshold: 1,
        isActive: true,
        query: [
            {
                $match: {
                    is_npc: false,
                    region_id: 10000070,
                    "attackers.character_id": "{{character_id}}",
                    "attackers.final_blow": true,
                },
            },
            {
                $count: "pochven_kills",
            },
        ],
    },
    {
        id: "pochven_warrior",
        name: "Pochven Warrior",
        description: "Achieve 100 kills in Pochven space.",
        type: "exploration",
        points: 150,
        pointsModifier: "positive",
        rarity: "epic",
        category: "Regional Combat",
        threshold: 100,
        isActive: true,
        query: [
            {
                $match: {
                    is_npc: false,
                    region_id: 10000070,
                    "attackers.character_id": "{{character_id}}",
                    "attackers.final_blow": true,
                },
            },
            {
                $count: "pochven_kills",
            },
        ],
    },
    {
        id: "pochven_warlord",
        name: "Pochven Warlord",
        description: "Achieve 1,000 kills in Pochven space.",
        type: "exploration",
        points: 750,
        pointsModifier: "positive",
        rarity: "legendary",
        category: "Regional Combat",
        threshold: 1000,
        isActive: true,
        query: [
            {
                $match: {
                    is_npc: false,
                    region_id: 10000070,
                    "attackers.character_id": "{{character_id}}",
                    "attackers.final_blow": true,
                },
            },
            {
                $count: "pochven_kills",
            },
        ],
    },
    {
        id: "pochven_overlord",
        name: "Pochven Overlord",
        description: "Achieve 10,000 kills in Pochven space.",
        type: "exploration",
        points: 3500,
        pointsModifier: "positive",
        rarity: "legendary",
        category: "Regional Combat",
        threshold: 10000,
        isActive: true,
        query: [
            {
                $match: {
                    is_npc: false,
                    region_id: 10000070,
                    "attackers.character_id": "{{character_id}}",
                    "attackers.final_blow": true,
                },
            },
            {
                $count: "pochven_kills",
            },
        ],
    },
    {
        id: "pochven_emperor",
        name: "Pochven Emperor",
        description: "Achieve 100,000 kills in Pochven space.",
        type: "exploration",
        points: 15000,
        pointsModifier: "positive",
        rarity: "legendary",
        category: "Regional Combat",
        threshold: 100000,
        isActive: true,
        query: [
            {
                $match: {
                    is_npc: false,
                    region_id: 10000070,
                    "attackers.character_id": "{{character_id}}",
                    "attackers.final_blow": true,
                },
            },
            {
                $count: "pochven_kills",
            },
        ],
    },

    // === ABYSSAL SPACE ACHIEVEMENTS ===
    {
        id: "abyssal_explorer",
        name: "Abyssal Explorer",
        description: "Get your first kill in abyssal space.",
        type: "exploration",
        points: 35,
        pointsModifier: "positive",
        rarity: "rare",
        category: "Regional Combat",
        threshold: 1,
        isActive: true,
        query: [
            {
                $match: {
                    is_npc: false,
                    region_id: { $gte: 12000000, $lte: 13000000 },
                    "attackers.character_id": "{{character_id}}",
                    "attackers.final_blow": true,
                },
            },
            {
                $count: "abyssal_kills",
            },
        ],
    },
    {
        id: "abyssal_hunter",
        name: "Abyssal Hunter",
        description: "Achieve 100 kills in abyssal space.",
        type: "exploration",
        points: 175,
        pointsModifier: "positive",
        rarity: "epic",
        category: "Regional Combat",
        threshold: 100,
        isActive: true,
        query: [
            {
                $match: {
                    is_npc: false,
                    region_id: { $gte: 12000000, $lte: 13000000 },
                    "attackers.character_id": "{{character_id}}",
                    "attackers.final_blow": true,
                },
            },
            {
                $count: "abyssal_kills",
            },
        ],
    },
    {
        id: "abyssal_overlord",
        name: "Abyssal Overlord",
        description: "Achieve 1,000 kills in abyssal space.",
        type: "exploration",
        points: 875,
        pointsModifier: "positive",
        rarity: "legendary",
        category: "Regional Combat",
        threshold: 1000,
        isActive: true,
        query: [
            {
                $match: {
                    is_npc: false,
                    region_id: { $gte: 12000000, $lte: 13000000 },
                    "attackers.character_id": "{{character_id}}",
                    "attackers.final_blow": true,
                },
            },
            {
                $count: "abyssal_kills",
            },
        ],
    },

    // === HIGH VALUE ACHIEVEMENTS ===
    {
        id: "big_fish",
        name: "Big Fish",
        description: "Kill a capital ship, supercarrier, titan, or freighter.",
        type: "pvp",
        points: 100,
        pointsModifier: "positive",
        rarity: "rare",
        category: "High Value Targets",
        threshold: 1,
        isActive: true,
        query: [
            {
                $match: {
                    is_npc: false,
                    "victim.ship_group_id": {
                        $in: [547, 485, 659, 30, 513, 902], // carriers, dreadnoughts, supercarriers, titans, freighters, jump freighters
                    },
                    "attackers.character_id": "{{character_id}}",
                    "attackers.final_blow": true,
                },
            },
            {
                $count: "big_kills",
            },
        ],
    },
    {
        id: "capital_hunter",
        name: "Capital Hunter",
        description: "Kill 10 capital ships.",
        type: "pvp",
        points: 500,
        pointsModifier: "positive",
        rarity: "epic",
        category: "High Value Targets",
        threshold: 10,
        isActive: true,
        query: [
            {
                $match: {
                    is_npc: false,
                    "victim.ship_group_id": {
                        $in: [547, 485, 659, 30, 513, 902],
                    }, // all capital types
                    "attackers.character_id": "{{character_id}}",
                    "attackers.final_blow": true,
                },
            },
            {
                $count: "capital_kills",
            },
        ],
    },
    {
        id: "titan_slayer",
        name: "Titan Slayer",
        description: "Kill a titan.",
        type: "pvp",
        points: 2000,
        pointsModifier: "positive",
        rarity: "legendary",
        category: "High Value Targets",
        threshold: 1,
        isActive: true,
        query: [
            {
                $match: {
                    is_npc: false,
                    "victim.ship_group_id": { $in: [30] },
                    "attackers.character_id": "{{character_id}}",
                    "attackers.final_blow": true,
                },
            },
            {
                $count: "titan_kills",
            },
        ],
    },
    {
        id: "supercarrier_hunter",
        name: "Supercarrier Hunter",
        description: "Kill a supercarrier.",
        type: "pvp",
        points: 1500,
        pointsModifier: "positive",
        rarity: "legendary",
        category: "High Value Targets",
        threshold: 1,
        isActive: true,
        query: [
            {
                $match: {
                    is_npc: false,
                    "victim.ship_group_id": { $in: [659] },
                    "attackers.character_id": "{{character_id}}",
                    "attackers.final_blow": true,
                },
            },
            {
                $count: "supercarrier_kills",
            },
        ],
    },
    {
        id: "billion_isk_kill",
        name: "Billion ISK Kill",
        description: "Get a kill worth at least 1 billion ISK.",
        type: "pvp",
        points: 50,
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
                    "attackers.character_id": "{{character_id}}",
                    "attackers.final_blow": true,
                },
            },
            {
                $count: "billion_kills",
            },
        ],
    },
    {
        id: "five_billion_isk_kill",
        name: "Five Billion ISK Kill",
        description: "Get a kill worth at least 5 billion ISK.",
        type: "pvp",
        points: 150,
        pointsModifier: "positive",
        rarity: "rare",
        category: "High Value Targets",
        threshold: 1,
        isActive: true,
        query: [
            {
                $match: {
                    is_npc: false,
                    total_value: { $gte: 5000000000 },
                    "attackers.character_id": "{{character_id}}",
                    "attackers.final_blow": true,
                },
            },
            {
                $count: "five_billion_kills",
            },
        ],
    },
    {
        id: "ten_billion_isk_kill",
        name: "Ten Billion ISK Kill",
        description: "Get a kill worth at least 10 billion ISK.",
        type: "pvp",
        points: 500,
        pointsModifier: "positive",
        rarity: "epic",
        category: "High Value Targets",
        threshold: 1,
        isActive: true,
        query: [
            {
                $match: {
                    is_npc: false,
                    total_value: { $gte: 10000000000 },
                    "attackers.character_id": "{{character_id}}",
                    "attackers.final_blow": true,
                },
            },
            {
                $count: "ten_billion_kills",
            },
        ],
    },

    // === CITADEL ACHIEVEMENTS ===
    {
        id: "structure_killer",
        name: "Structure Killer",
        description: "Destroy a citadel or structure.",
        type: "pvp",
        points: 250,
        pointsModifier: "positive",
        rarity: "epic",
        category: "Infrastructure",
        threshold: 1,
        isActive: true,
        query: [
            {
                $match: {
                    is_npc: false,
                    "victim.ship_group_id": {
                        $in: [1657, 1406, 1404, 1408, 2017, 2016],
                    },
                    "attackers.character_id": "{{character_id}}",
                    "attackers.final_blow": true,
                },
            },
            {
                $count: "structure_kills",
            },
        ],
    },
    {
        id: "structure_destroyer",
        name: "Structure Destroyer",
        description: "Destroy 10 citadels or structures.",
        type: "pvp",
        points: 1000,
        pointsModifier: "positive",
        rarity: "legendary",
        category: "Infrastructure",
        threshold: 10,
        isActive: true,
        query: [
            {
                $match: {
                    is_npc: false,
                    "victim.ship_group_id": {
                        $in: [1657, 1406, 1404, 1408, 2017, 2016],
                    },
                    "attackers.character_id": "{{character_id}}",
                    "attackers.final_blow": true,
                },
            },
            {
                $count: "structure_kills",
            },
        ],
    },

    // === SPECIAL ACHIEVEMENTS (Based on zKillboard) ===
    {
        id: "concordokken",
        name: "Concordokken!",
        description: "Get killed by CONCORD for your crimes.",
        type: "special",
        points: 10,
        pointsModifier: "negative",
        rarity: "uncommon",
        category: "Special Events",
        threshold: 1,
        isActive: true,
        query: [
            {
                $match: {
                    "victim.character_id": "{{character_id}}",
                    "attackers.corporation_id": 1000125,
                },
            },
            {
                $count: "concord_losses",
            },
        ],
    },
    {
        id: "killed_by_ccp_dev",
        name: "What Did You Do?!",
        description: "Get killed by a CCP developer.",
        type: "special",
        points: 100,
        pointsModifier: "negative",
        rarity: "epic",
        category: "Special Events",
        threshold: 1,
        isActive: true,
        query: [
            {
                $match: {
                    "victim.character_id": "{{character_id}}",
                    "attackers.corporation_id": 109299958,
                },
            },
            {
                $count: "ccp_dev_losses",
            },
        ],
    },
    {
        id: "killed_ccp_dev",
        name: "Banhammer Incoming!",
        description: "Kill a CCP developer (good luck with that!).",
        type: "special",
        points: 500,
        pointsModifier: "positive",
        rarity: "legendary",
        category: "Special Events",
        threshold: 1,
        isActive: true,
        query: [
            {
                $match: {
                    "victim.corporation_id": 109299958,
                    "attackers.character_id": "{{character_id}}",
                    "attackers.final_blow": true,
                },
            },
            {
                $count: "ccp_dev_kills",
            },
        ],
    },
    {
        id: "tournament_participant",
        name: "Tournament Participant",
        description: "Participate in an official EVE tournament.",
        type: "special",
        points: 1000,
        pointsModifier: "positive",
        rarity: "legendary",
        category: "Special Events",
        threshold: 1,
        isActive: true,
        query: [
            {
                $match: {
                    region_id: 10000004,
                    $or: [
                        { "victim.character_id": "{{character_id}}" },
                        { "attackers.character_id": "{{character_id}}" },
                    ],
                },
            },
            {
                $count: "tournament_participation",
            },
        ],
    },
    {
        id: "freighter_hunter",
        name: "Ganktastic Bonus: Freighters Must Die",
        description: "Destroy a freighter.",
        type: "pvp",
        points: 150,
        pointsModifier: "positive",
        rarity: "rare",
        category: "High Value Targets",
        threshold: 1,
        isActive: true,
        query: [
            {
                $match: {
                    is_npc: false,
                    "victim.ship_group_id": 513,
                    "attackers.character_id": "{{character_id}}",
                    "attackers.final_blow": true,
                },
            },
            {
                $count: "freighter_kills",
            },
        ],
    },

    // === POTENTIAL GANKING DETECTION ===
    {
        id: "suicide_ganker",
        name: "GANKED: Suicide Mission",
        description:
            "Get a kill in highsec then die to CONCORD within 60 seconds.",
        type: "special",
        points: 50,
        pointsModifier: "positive",
        rarity: "rare",
        category: "Special Events",
        threshold: 1,
        isActive: false, // Disabled until we can implement proper ganking detection
        query: [
            {
                $match: {
                    system_security: { $gte: 0.5 },
                    is_npc: false,
                    "attackers.character_id": "{{character_id}}",
                    "attackers.final_blow": true,
                },
            },
            // This would need a complex lookup to check if the character died to CONCORD within 60 seconds
            // We'd need to implement this as a custom aggregation or separate logic
            {
                $count: "potential_gank_kills",
            },
        ],
    },

    // === TEMPORAL ACHIEVEMENTS ===
    {
        id: "sweet_revenge",
        name: "Sweet Revenge",
        description: "Kill a player who killed you within the last 2 hours.",
        type: "special",
        points: 100,
        pointsModifier: "positive",
        rarity: "rare",
        category: "Temporal Events",
        threshold: 1,
        temporal: true,
        isActive: true,
        customFunction: async (
            characterId: number
        ): Promise<{ count: number; killmailIds: number[] }> => {
            try {
                // Use Maps to efficiently track deaths and potential revenge targets
                const deathsByKiller = new Map<number, any[]>(); // killer_id -> death records
                const revengeKills = new Set<string>(); // Track unique revenge kills to avoid duplicates

                // Step 1: Get all deaths where this character was the victim
                const deaths = await Killmails.find({
                    is_npc: false,
                    "victim.character_id": characterId,
                })
                    .select({
                        killmail_id: 1,
                        kill_time: 1,
                        "attackers.character_id": 1,
                        "attackers.final_blow": 1,
                    })
                    .lean();

                // Group deaths by killer for efficient lookup
                for (const death of deaths) {
                    const killer = death.attackers?.find(
                        (att: any) => att.final_blow
                    );
                    if (killer?.character_id) {
                        if (!deathsByKiller.has(killer.character_id)) {
                            deathsByKiller.set(killer.character_id, []);
                        }
                        deathsByKiller.get(killer.character_id)!.push({
                            killmail_id: death.killmail_id,
                            kill_time: death.kill_time,
                        });
                    }
                }

                // Step 2: Get all kills by this character and check for revenge opportunities
                const kills = await Killmails.find({
                    is_npc: false,
                    "attackers.character_id": characterId,
                    "attackers.final_blow": true,
                })
                    .select({
                        killmail_id: 1,
                        kill_time: 1,
                        "victim.character_id": 1,
                    })
                    .lean();

                // Check each kill for revenge potential
                for (const kill of kills) {
                    const victimId = kill.victim?.character_id;
                    if (!victimId || !deathsByKiller.has(victimId)) continue;

                    const killTime = new Date(kill.kill_time).getTime();
                    const recentDeaths = deathsByKiller
                        .get(victimId)!
                        .filter((death) => {
                            const deathTime = new Date(
                                death.kill_time
                            ).getTime();
                            const timeDiff = killTime - deathTime;
                            return timeDiff > 0 && timeDiff <= 2 * 60 * 60 * 1000; // 2 hours
                        });

                    if (recentDeaths.length > 0) {
                        revengeKills.add(kill.killmail_id.toString());
                    }
                }

                return {
                    count: revengeKills.size,
                    killmailIds: Array.from(revengeKills).map((id) =>
                        parseInt(id)
                    ),
                };
            } catch (error) {
                console.error("Error in Sweet Revenge achievement:", error);
                return { count: 0, killmailIds: [] };
            }
        },
    },

    // === MORE TEMPORAL ACHIEVEMENTS ===
    {
        id: "killing_spree",
        name: "Killing Spree",
        description: "Kill 10 ships within 10 minutes, solo (no fleet).",
        type: "special",
        points: 150,
        pointsModifier: "positive",
        rarity: "rare",
        category: "Temporal Events",
        threshold: 1,
        temporal: true,
        isActive: true,
        customFunction: async (characterId: number): Promise<number> => {
            try {
                const tenMinutes = 10 * 60 * 1000; // 10 minutes in milliseconds
                let killingSprees = 0;

                // Get all solo kills by this character, sorted by time
                const soloKills = await Killmails.find({
                    is_npc: false,
                    is_solo: true, // Use the built-in solo flag
                    "attackers.character_id": characterId,
                    "attackers.final_blow": true,
                })
                    .select({
                        killmail_id: 1,
                        kill_time: 1,
                    })
                    .lean()
                    .sort({ kill_time: 1 });

                if (soloKills.length < 10) return 0;

                // Sliding window approach to find 10 kills within 10 minutes
                for (let i = 0; i <= soloKills.length - 10; i++) {
                    const firstKill = new Date(
                        soloKills[i].kill_time
                    ).getTime();
                    const tenthKill = new Date(
                        soloKills[i + 9].kill_time
                    ).getTime();

                    if (tenthKill - firstKill <= tenMinutes) {
                        killingSprees++;
                        // Skip ahead to avoid overlapping sprees
                        i += 9;
                    }
                }

                return killingSprees;
            } catch (error) {
                console.error(
                    `Error calculating Killing Spree achievement for character ${characterId}:`,
                    error
                );
                return 0;
            }
        },
        query: [],
    },

    {
        id: "nullbloc_private",
        name: "Nullbloc Private First Class",
        description:
            "Kill 100 ships within an hour in a fleet of more than 50 people in nullsec.",
        type: "special",
        points: 300,
        pointsModifier: "positive",
        rarity: "epic",
        category: "Temporal Events",
        threshold: 1,
        temporal: true,
        isActive: true,
        customFunction: async (characterId: number): Promise<number> => {
            try {
                const oneHour = 60 * 60 * 1000; // 1 hour in milliseconds
                let massFleetKills = 0;

                // Get all kills in nullsec (security <= 0) with large fleet
                const fleetKills = await Killmails.aggregate([
                    {
                        $match: {
                            is_npc: false,
                            "attackers.character_id": characterId,
                            "attackers.final_blow": true,
                            system_security: { $lte: 0.0 }, // Corrected field name for nullsec
                        },
                    },
                    {
                        $project: {
                            kill_time: 1,
                            attackers: 1,
                        },
                    },
                    {
                        $addFields: {
                            fleet_size: { $size: "$attackers" },
                        },
                    },
                    {
                        $match: {
                            fleet_size: { $gt: 50 }, // Fleet larger than 50
                        },
                    },
                    {
                        $sort: { kill_time: 1 },
                    },
                ]);

                if (fleetKills.length < 100) return 0;

                // Check for 100 kills within 1 hour
                for (let i = 0; i <= fleetKills.length - 100; i++) {
                    const firstKill = new Date(
                        fleetKills[i].kill_time
                    ).getTime();
                    const hundredthKill = new Date(
                        fleetKills[i + 99].kill_time
                    ).getTime();

                    if (hundredthKill - firstKill <= oneHour) {
                        massFleetKills++;
                        console.log(
                            `   ⚔️  Mass fleet engagement: 100 kills between ${
                                fleetKills[i].kill_time
                            } and ${
                                fleetKills[i + 99].kill_time
                            } with fleet size ${fleetKills[i].fleet_size}`
                        );
                        i += 99; // Skip ahead
                    }
                }

                return massFleetKills;
            } catch (error) {
                console.error(
                    `Error calculating Nullbloc Private achievement for character ${characterId}:`,
                    error
                );
                return 0;
            }
        },
        query: [],
    },

    {
        id: "david_vs_goliath",
        name: "David vs Goliath",
        description:
            "Kill a capital ship in a subcapital ship, solo (no fleet assistance).",
        type: "special",
        points: 500,
        pointsModifier: "positive",
        rarity: "legendary",
        category: "Temporal Events",
        threshold: 1,
        temporal: true,
        isActive: true,
        customFunction: async (characterId: number): Promise<number> => {
            try {
                // Capital ship group IDs from killlist API - all capital types
                const capitalShipGroups = [547, 485, 659, 30];

                // Subcapital ship groups (everything that's NOT a capital)
                const subcapitalGroups = [
                    324,
                    893,
                    25,
                    831,
                    237, // frigates
                    420,
                    541, // destroyers
                    906,
                    26,
                    833,
                    358,
                    894,
                    832,
                    963, // cruisers
                    419,
                    540, // battlecruisers
                    27,
                    898,
                    900, // battleships
                ];

                let davidKills = 0; // Find kills where this character killed a capital ship, solo
                const capitalKills = await Killmails.find({
                    is_npc: false,
                    is_solo: true, // Solo kill
                    "attackers.character_id": characterId,
                    "attackers.final_blow": true,
                    "victim.ship_group_id": { $in: capitalShipGroups },
                })
                    .select({
                        killmail_id: 1,
                        kill_time: 1,
                        "victim.ship_name": 1,
                        "attackers.character_id": 1,
                        "attackers.final_blow": 1,
                        "attackers.ship_group_id": 1,
                        "attackers.ship_name": 1,
                    })
                    .lean();

                for (const kill of capitalKills) {
                    const km = kill as any;

                    // Find this character's attacker entry to check their ship
                    const attackerEntry = km.attackers.find(
                        (attacker: any) =>
                            attacker.character_id === characterId &&
                            attacker.final_blow === true
                    );

                    if (
                        attackerEntry &&
                        subcapitalGroups.includes(attackerEntry.ship_group_id)
                    ) {
                        davidKills++;
                        console.log(
                            `   🏹 David vs Goliath: Killed capital ship (${km.victim.ship_name}) in a subcapital (${attackerEntry.ship_name}) at ${km.kill_time}`
                        );
                    }
                }

                return davidKills;
            } catch (error) {
                console.error(
                    `Error calculating David vs Goliath achievement for character ${characterId}:`,
                    error
                );
                return 0;
            }
        },
        query: [],
    },

    {
        id: "rampage",
        name: "Rampage",
        description: "Get 5 kills without dying.",
        type: "special",
        points: 100,
        pointsModifier: "positive",
        rarity: "rare",
        category: "Temporal Events",
        threshold: 1,
        temporal: true,
        isActive: true,
        customFunction: async (characterId: number): Promise<number> => {
            try {
                let rampages = 0;
                let currentKillStreak = 0;

                // Get all events (kills and deaths) sorted by time
                const allEvents = await Killmails.find({
                    is_npc: false,
                    $or: [
                        { "victim.character_id": characterId },
                        {
                            "attackers.character_id": characterId,
                            "attackers.final_blow": true,
                        },
                    ],
                })
                    .select({
                        killmail_id: 1,
                        kill_time: 1,
                        "victim.character_id": 1,
                        "attackers.character_id": 1,
                        "attackers.final_blow": 1,
                    })
                    .lean()
                    .sort({ kill_time: 1 });

                for (const event of allEvents) {
                    if (event.victim?.character_id === characterId) {
                        // We died, reset kill streak
                        currentKillStreak = 0;
                    } else {
                        // Check if we got the kill
                        const gotKill = event.attackers?.some(
                            (attacker: any) =>
                                attacker.character_id === characterId &&
                                attacker.final_blow === true
                        );

                        if (gotKill) {
                            currentKillStreak++;
                            if (currentKillStreak === 5) {
                                rampages++;
                            }
                        }
                    }
                }

                return rampages;
            } catch (error) {
                console.error(
                    `Error calculating Rampage achievement for character ${characterId}:`,
                    error
                );
                return 0;
            }
        },
        query: [],
    },

    // === SHIP TYPE SPECIFIC ACHIEVEMENTS ===
    {
        id: "frigate_killer",
        name: "Frigate Hunter",
        description: "Destroy 100 frigates.",
        type: "pvp",
        points: 25,
        pointsModifier: "positive",
        rarity: "uncommon",
        category: "Ship Classes",
        threshold: 100,
        isActive: true,
        query: [
            {
                $match: {
                    is_npc: false,
                    "victim.ship_group_id": { $in: [324, 893, 25, 831, 237] },
                    "attackers.character_id": "{{character_id}}",
                    "attackers.final_blow": true,
                },
            },
            {
                $count: "frigate_kills",
            },
        ],
    },
    {
        id: "destroyer_killer",
        name: "Destroyer Hunter",
        description: "Destroy 100 destroyers.",
        type: "pvp",
        points: 35,
        pointsModifier: "positive",
        rarity: "uncommon",
        category: "Ship Classes",
        threshold: 100,
        isActive: true,
        query: [
            {
                $match: {
                    is_npc: false,
                    "victim.ship_group_id": { $in: [420, 541] },
                    "attackers.character_id": "{{character_id}}",
                    "attackers.final_blow": true,
                },
            },
            {
                $count: "destroyer_kills",
            },
        ],
    },
    {
        id: "cruiser_killer",
        name: "Cruiser Hunter",
        description: "Destroy 100 cruisers.",
        type: "pvp",
        points: 50,
        pointsModifier: "positive",
        rarity: "uncommon",
        category: "Ship Classes",
        threshold: 100,
        isActive: true,
        query: [
            {
                $match: {
                    is_npc: false,
                    "victim.ship_group_id": {
                        $in: [906, 26, 833, 358, 894, 832, 963],
                    },
                    "attackers.character_id": "{{character_id}}",
                    "attackers.final_blow": true,
                },
            },
            {
                $count: "cruiser_kills",
            },
        ],
    },
    {
        id: "battlecruiser_killer",
        name: "Battlecruiser Hunter",
        description: "Destroy 50 battlecruisers.",
        type: "pvp",
        points: 75,
        pointsModifier: "positive",
        rarity: "rare",
        category: "Ship Classes",
        threshold: 50,
        isActive: true,
        query: [
            {
                $match: {
                    is_npc: false,
                    "victim.ship_group_id": { $in: [419, 540] },
                    "attackers.character_id": "{{character_id}}",
                    "attackers.final_blow": true,
                },
            },
            {
                $count: "battlecruiser_kills",
            },
        ],
    },
    {
        id: "battleship_killer",
        name: "Battleship Hunter",
        description: "Destroy 50 battleships.",
        type: "pvp",
        points: 100,
        pointsModifier: "positive",
        rarity: "rare",
        category: "Ship Classes",
        threshold: 50,
        isActive: true,
        query: [
            {
                $match: {
                    is_npc: false,
                    "victim.ship_group_id": { $in: [27, 898, 900] },
                    "attackers.character_id": "{{character_id}}",
                    "attackers.final_blow": true,
                },
            },
            {
                $count: "battleship_kills",
            },
        ],
    },

    // === T1/T2/T3 SHIP ACHIEVEMENTS ===
    {
        id: "t1_ship_killer",
        name: "T1 Ship Destroyer",
        description: "Destroy 500 Tech 1 ships.",
        type: "pvp",
        points: 100,
        pointsModifier: "positive",
        rarity: "uncommon",
        category: "Tech Levels",
        threshold: 500,
        isActive: true,
        query: [
            {
                $match: {
                    is_npc: false,
                    "victim.ship_group_id": {
                        $in: [
                            419, 27, 29, 547, 26, 420, 25, 28, 941, 463, 237,
                            31,
                        ],
                    },
                    "attackers.character_id": "{{character_id}}",
                    "attackers.final_blow": true,
                },
            },
            {
                $count: "t1_ship_kills",
            },
        ],
    },
    {
        id: "t2_ship_killer",
        name: "T2 Ship Destroyer",
        description: "Destroy 250 Tech 2 ships.",
        type: "pvp",
        points: 200,
        pointsModifier: "positive",
        rarity: "rare",
        category: "Tech Levels",
        threshold: 250,
        isActive: true,
        query: [
            {
                $match: {
                    is_npc: false,
                    "victim.ship_group_id": {
                        $in: [
                            324, 898, 906, 540, 830, 893, 543, 541, 833, 358,
                            894, 831, 902, 832, 900, 834, 380,
                        ],
                    },
                    "attackers.character_id": "{{character_id}}",
                    "attackers.final_blow": true,
                },
            },
            {
                $count: "t2_ship_kills",
            },
        ],
    },
    {
        id: "t3_ship_killer",
        name: "T3 Ship Destroyer",
        description: "Destroy 25 Tech 3 ships.",
        type: "pvp",
        points: 400,
        pointsModifier: "positive",
        rarity: "epic",
        category: "Tech Levels",
        threshold: 25,
        isActive: true,
        query: [
            {
                $match: {
                    is_npc: false,
                    "victim.ship_group_id": { $in: [963, 1305] },
                    "attackers.character_id": "{{character_id}}",
                    "attackers.final_blow": true,
                },
            },
            {
                $count: "t3_ship_kills",
            },
        ],
    },
];

/**
 * Service class for handling achievement calculations and updates
 */
export class AchievementService {
    /**
     * Generates ship-type specific kill and loss achievements based on InvGroups data
     */
    private static async generateShipTypeAchievements(): Promise<
        IAchievement[]
    > {
        try {
            // Get all ship groups (category_id: 6 is for ships) from cache
            const shipGroups = await getShipGroups();
            const generatedAchievements: IAchievement[] = [];

            for (const group of shipGroups) {
                const groupName = group.name?.en || `Group ${group.group_id}`;

                // Skip if no English name is available
                if (!group.name?.en) {
                    continue;
                }

                // Generate Kill Achievement
                const killAchievement: IAchievement = {
                    id: `kill_${group.group_id}`,
                    name: `Kill ${
                        groupName.startsWith("a") ||
                        groupName.startsWith("e") ||
                        groupName.startsWith("i") ||
                        groupName.startsWith("o") ||
                        groupName.startsWith("u")
                            ? "an"
                            : "a"
                    } ${groupName}`,
                    description: `Kill ${
                        groupName.startsWith("a") ||
                        groupName.startsWith("e") ||
                        groupName.startsWith("i") ||
                        groupName.startsWith("o") ||
                        groupName.startsWith("u")
                            ? "an"
                            : "a"
                    } ${groupName} in combat.`,
                    type: "pvp",
                    points: this.getPointsForShipType(groupName),
                    pointsModifier: "positive",
                    rarity: this.getRarityForShipType(groupName),
                    category: "Ship Kills",
                    threshold: 1,
                    isActive: true,
                    query: [
                        {
                            $match: {
                                is_npc: false,
                                "victim.ship_group_id": group.group_id,
                                "attackers.character_id": "{{character_id}}",
                                "attackers.final_blow": true,
                            },
                        },
                        {
                            $count: "total_kills",
                        },
                    ],
                };

                // Generate Loss Achievement
                const lossAchievement: IAchievement = {
                    id: `lose_${group.group_id}`,
                    name: `Lose ${
                        groupName.startsWith("a") ||
                        groupName.startsWith("e") ||
                        groupName.startsWith("i") ||
                        groupName.startsWith("o") ||
                        groupName.startsWith("u")
                            ? "an"
                            : "a"
                    } ${groupName}`,
                    description: `Lose ${
                        groupName.startsWith("a") ||
                        groupName.startsWith("e") ||
                        groupName.startsWith("i") ||
                        groupName.startsWith("o") ||
                        groupName.startsWith("u")
                            ? "an"
                            : "a"
                    } ${groupName} in combat.`,
                    type: "pvp",
                    points: Math.ceil(
                        this.getPointsForShipType(groupName) * 0.3
                    ), // Loss achievements worth 30% of kill achievements
                    pointsModifier: "negative",
                    rarity: this.getRarityForShipType(groupName),
                    category: "Ship Losses",
                    threshold: 1,
                    isActive: true,
                    query: [
                        {
                            $match: {
                                is_npc: false,
                                "victim.ship_group_id": group.group_id,
                                "victim.character_id": "{{character_id}}",
                            },
                        },
                        {
                            $count: "total_losses",
                        },
                    ],
                };

                generatedAchievements.push(killAchievement, lossAchievement);
            }

            return generatedAchievements;
        } catch (error) {
            console.error("Error generating ship type achievements:", error);
            return [];
        }
    }

    /**
     * Determines achievement points based on ship type rarity/importance
     */
    private static getPointsForShipType(shipTypeName: string): number {
        const name = shipTypeName.toLowerCase();

        // Capital ships and rare ships
        if (name.includes("titan")) return 1000;
        if (name.includes("supercarrier")) return 800;
        if (
            name.includes("dreadnought") ||
            name.includes("carrier") ||
            name.includes("force auxiliary")
        )
            return 500;
        if (name.includes("capital")) return 400;

        // Expensive/rare subcaps
        if (name.includes("black ops") || name.includes("marauder")) return 200;
        if (name.includes("strategic cruiser") || name.includes("command ship"))
            return 150;
        if (name.includes("recon") || name.includes("heavy assault"))
            return 100;

        // Specialized ships
        if (
            name.includes("logistics") ||
            name.includes("interdictor") ||
            name.includes("interdiction")
        )
            return 80;
        if (name.includes("stealth bomber") || name.includes("covert ops"))
            return 60;
        if (name.includes("interceptor") || name.includes("assault frigate"))
            return 50;

        // T2 ships
        if (
            name.includes("tactical destroyer") ||
            name.includes("command destroyer")
        )
            return 40;
        if (name.includes("battlecruiser")) return 35;
        if (name.includes("battleship")) return 30;
        if (name.includes("cruiser")) return 25;
        if (name.includes("destroyer")) return 20;
        if (name.includes("frigate")) return 15;

        // Industrial and support
        if (name.includes("freighter") || name.includes("jump freighter"))
            return 150;
        if (name.includes("industrial") || name.includes("hauler")) return 25;
        if (name.includes("mining") || name.includes("exhumer")) return 30;

        // Default for other ships
        return 10;
    }

    /**
     * Determines achievement rarity based on ship type
     */
    private static getRarityForShipType(
        shipTypeName: string
    ): "common" | "uncommon" | "rare" | "epic" | "legendary" {
        const name = shipTypeName.toLowerCase();

        if (name.includes("titan")) return "legendary";
        if (name.includes("supercarrier") || name.includes("mothership"))
            return "legendary";
        if (
            name.includes("dreadnought") ||
            name.includes("carrier") ||
            name.includes("force auxiliary")
        )
            return "epic";
        if (
            name.includes("capital") ||
            name.includes("black ops") ||
            name.includes("marauder")
        )
            return "epic";
        if (
            name.includes("strategic cruiser") ||
            name.includes("command ship") ||
            name.includes("recon")
        )
            return "rare";
        if (
            name.includes("logistics") ||
            name.includes("stealth bomber") ||
            name.includes("heavy assault")
        )
            return "rare";
        if (
            name.includes("interceptor") ||
            name.includes("assault") ||
            name.includes("interdictor")
        )
            return "uncommon";
        if (
            name.includes("tactical destroyer") ||
            name.includes("command destroyer")
        )
            return "uncommon";

        return "common";
    }

    /**
     * Combined achievements array including static and dynamically generated achievements
     * Generates fresh achievements each time to prevent memory leaks
     */
    private static async getAllAchievements(): Promise<IAchievement[]> {
        const shipTypeAchievements = await this.generateShipTypeAchievements();
        return [...achievements, ...shipTypeAchievements];
    }

    /**
     * Initialize achievements for a new character with full achievement set
     * This method generates the complete achievement list including ship types
     * Should only be called when we know the character will be processed
     */
    static async initializeCharacter(
        characterId: number,
        characterName?: string,
        allAchievements?: IAchievement[]
    ) {
        const existingRecord = await CharacterAchievements.findOne({
            character_id: characterId,
        });
        if (existingRecord) {
            return existingRecord;
        }

        // Use provided achievements or generate them (but only when called from calculateAchievements)
        const achievementList =
            allAchievements || (await this.getAllAchievements());
        const activeAchievements = achievementList.filter(
            (achievement) => achievement.isActive
        );

        const characterAchievements = activeAchievements.map((achievement) => ({
            achievement_id: achievement.id,
            name: achievement.name,
            description: achievement.description,
            type: achievement.type,
            points: achievement.points,
            rarity: achievement.rarity,
            category: achievement.category,
            threshold: achievement.threshold || 1,
            current_count: 0,
            is_completed: false,
            completion_tiers: 0,
            last_updated: new Date(),
        }));

        const doc = new CharacterAchievements({
            character_id: characterId,
            character_name: characterName,
            achievements: characterAchievements,
        });

        return await doc.save();
    }

    /**
     * Initialize achievements for a character with only static achievements (no ship types)
     * Used for characters with no kill/loss activity to skip expensive ship achievement generation
     */
    static async initializeCharacterWithStaticOnly(
        characterId: number,
        characterName?: string
    ) {
        const existingRecord = await CharacterAchievements.findOne({
            character_id: characterId,
        });
        if (existingRecord) {
            return existingRecord;
        }

        // Only use static achievements, skip ship type generation
        const activeAchievements = achievements.filter(
            (achievement) => achievement.isActive
        );

        const characterAchievements = activeAchievements.map((achievement) => ({
            achievement_id: achievement.id,
            name: achievement.name,
            description: achievement.description,
            type: achievement.type,
            points: achievement.points,
            rarity: achievement.rarity,
            category: achievement.category,
            threshold: achievement.threshold || 1,
            current_count: 0,
            is_completed: false,
            completion_tiers: 0,
            last_updated: new Date(),
        }));

        const doc = new CharacterAchievements({
            character_id: characterId,
            character_name: characterName,
            achievements: characterAchievements,
        });

        return await doc.save();
    }

    /**
     * Calculate and update all achievements for a character
     */
    static async calculateAchievements(
        characterId: number,
        characterName?: string
    ) {
        // Quick check: if character has no kills or losses, skip expensive ship achievement generation
        const hasActivity = await Killmails.countDocuments({
            $or: [
                { "victim.character_id": characterId },
                { "attackers.character_id": characterId },
            ],
        });

        // Get or create the character's achievement record
        let characterRecord = await CharacterAchievements.findOne({
            character_id: characterId,
        });

        // Generate achievements once for this character processing (only if we have activity)
        let allAchievements: IAchievement[] | undefined;
        if (hasActivity > 0) {
            allAchievements = await this.getAllAchievements();
        }

        if (!characterRecord) {
            // If no activity, just initialize with static achievements only
            if (hasActivity === 0) {
                return await this.initializeCharacterWithStaticOnly(
                    characterId,
                    characterName
                );
            } else {
                characterRecord = await this.initializeCharacter(
                    characterId,
                    characterName,
                    allAchievements
                );
            }
        }

        // If no activity, no need to calculate anything further
        if (hasActivity === 0) {
            return characterRecord;
        }

        const updates: any = {};
        let hasUpdates = false;

        // Create achievement lookup map for efficient access
        const achievementLookup = new Map<string, IAchievement>();
        for (const achievement of allAchievements!) {
            achievementLookup.set(achievement.id, achievement);
        }

        // Separate achievements into regular and custom function achievements
        const activeAchievements = allAchievements!.filter((a) => a.isActive);
        const regularAchievements = activeAchievements.filter(
            (a) => !a.customFunction
        );
        const customFunctionAchievements = activeAchievements.filter(
            (a) => a.customFunction
        );

        // Build achievement results map
        const achievementResults: Record<
            string,
            { count: number; killmailIds: number[] }
        > = {};

        // First, process achievements with custom functions in parallel for better performance
        const customFunctionPromises = customFunctionAchievements.map(async (achievement) => {
            try {
                if (achievement.customFunction) {
                    console.log(
                        `🔧 Processing custom function achievement: ${achievement.name}`
                    );
                    const result = await achievement.customFunction(
                        characterId
                    );
                    const achievementResult = typeof result === "number" 
                        ? { count: result, killmailIds: [] }
                        : { count: result.count, killmailIds: result.killmailIds };
                    
                    return { id: achievement.id, result: achievementResult };
                }
                return null;
            } catch (error) {
                console.error(
                    `Error calculating custom function achievement ${achievement.id} for character ${characterId}:`,
                    error
                );
                return { id: achievement.id, result: { count: 0, killmailIds: [] } };
            }
        });
        
        // Wait for all custom function achievements to complete in parallel
        const customFunctionResults = await Promise.all(customFunctionPromises);
        
        // Add results to achievementResults
        for (const result of customFunctionResults) {
            if (result) {
                achievementResults[result.id] = result.result;
            }
        }

        // Process regular achievements using faceted aggregation
        if (regularAchievements.length > 0) {
            const pipeline = this.buildFacetedAchievementPipeline(
                regularAchievements,
                characterId
            );

            try {
                const facetResults = await Killmails.aggregate(pipeline, {
                    allowDiskUse: true,
                });
                const [results] = facetResults;

                // Process faceted results
                for (const achievement of regularAchievements) {
                    const facetKey = `achievement_${achievement.id}`;
                    const facetResult = results[facetKey] || [];

                    let count = 0;
                    let killmailIds: number[] = [];

                    // Extract count from facet result
                    if (facetResult.length > 0) {
                        const resultKeys = Object.keys(facetResult[0]);

                        if (
                            resultKeys.includes("count") &&
                            resultKeys.includes("killmail_ids")
                        ) {
                            // New format for achievements with trackKillmails
                            count = facetResult[0].count || 0;
                            killmailIds = facetResult[0].killmail_ids || [];
                        } else {
                            // Default handling for regular count results
                            count =
                                resultKeys.length > 0
                                    ? facetResult[0][resultKeys[0]!] || 0
                                    : 0;
                        }
                    }

                    achievementResults[achievement.id] = { count, killmailIds };
                }
            } catch (error) {
                console.error(
                    `Error executing faceted aggregation for character ${characterId}:`,
                    error
                );
                // Fallback to individual queries if faceted aggregation fails
                for (const achievement of regularAchievements) {
                    try {
                        // Skip achievements without query (temporal achievements with customFunction)
                        if (!achievement.query) continue;
                        
                        const query = this.replaceCharacterIdInQuery(
                            achievement.query,
                            characterId
                        );
                        const queryResult = await Killmails.aggregate(query, {
                            allowDiskUse: true,
                        });
                        const resultKeys =
                            queryResult.length > 0
                                ? Object.keys(queryResult[0])
                                : [];
                        const count =
                            queryResult.length > 0 && resultKeys.length > 0
                                ? queryResult[0][resultKeys[0]!] || 0
                                : 0;

                        achievementResults[achievement.id] = {
                            count,
                            killmailIds: [],
                        };
                    } catch (individualError) {
                        console.error(
                            `Error calculating achievement ${achievement.id} for character ${characterId}:`,
                            individualError
                        );
                        achievementResults[achievement.id] = {
                            count: 0,
                            killmailIds: [],
                        };
                    }
                }
            }
        }

        // Apply updates based on calculated results
        for (const achievement of activeAchievements) {
            const result = achievementResults[achievement.id];
            if (!result) continue;

            const { count, killmailIds } = result;

            // Find existing achievement in character record
            const existingAchievementIndex =
                characterRecord.achievements.findIndex(
                    (a) => a.achievement_id === achievement.id
                );

            if (existingAchievementIndex >= 0) {
                const existingAchievement =
                    characterRecord.achievements[existingAchievementIndex];
                if (existingAchievement) {
                    const wasCompleted = existingAchievement.is_completed;
                    const isCompleted = count >= (achievement.threshold || 1);

                    // Calculate completion tiers (how many times they've earned this achievement)
                    const newCompletionTiers = Math.floor(
                        count / (achievement.threshold || 1)
                    );
                    const oldCompletionTiers =
                        existingAchievement.completion_tiers || 0;

                    // Update if count changed or completion status changed
                    if (
                        existingAchievement.current_count !== count ||
                        wasCompleted !== isCompleted ||
                        oldCompletionTiers !== newCompletionTiers
                    ) {
                        updates[
                            `achievements.${existingAchievementIndex}.current_count`
                        ] = count;
                        updates[
                            `achievements.${existingAchievementIndex}.is_completed`
                        ] = isCompleted;
                        updates[
                            `achievements.${existingAchievementIndex}.completion_tiers`
                        ] = newCompletionTiers;
                        updates[
                            `achievements.${existingAchievementIndex}.last_updated`
                        ] = new Date();

                        // Set completion date if newly completed
                        if (isCompleted && !wasCompleted) {
                            updates[
                                `achievements.${existingAchievementIndex}.completed_at`
                            ] = new Date();
                        }

                        hasUpdates = true;
                    }
                }
            }
        }

        // Apply updates if any
        if (hasUpdates) {
            updates.character_name = characterName;
            updates.last_calculated = new Date();

            await CharacterAchievements.updateOne(
                { character_id: characterId },
                { $set: updates }
            );

            // Fetch the updated record to recalculate totals
            const updatedRecord = await CharacterAchievements.findOne({
                character_id: characterId,
            });
            if (updatedRecord) {
                // Manually calculate totals since updateOne bypasses pre-save middleware
                const completedAchievements = updatedRecord.achievements.filter(
                    (a) => a.is_completed
                );
                // Calculate total points based on completion tiers and pointsModifier
                const totalPoints = updatedRecord.achievements.reduce(
                    (sum, achievement) => {
                        const basePoints =
                            achievement.points *
                            (achievement.completion_tiers || 0);
                        // Find the achievement definition to get pointsModifier
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

                // Update the totals
                updatedRecord.total_achievements =
                    updatedRecord.achievements.length;
                updatedRecord.completed_achievements =
                    completedAchievements.length;
                updatedRecord.total_points = totalPoints;
                updatedRecord.last_calculated = new Date();

                await updatedRecord.save();
            }

            return updatedRecord;
        } else {
            // Even if no updates were detected, make sure totals are correct
            const completedAchievements = characterRecord.achievements.filter(
                (a) => a.is_completed
            );
            // Calculate total points based on completion tiers and pointsModifier
            const totalPoints = characterRecord.achievements.reduce(
                (sum, achievement) => {
                    const basePoints =
                        achievement.points *
                        (achievement.completion_tiers || 0);
                    // Find the achievement definition to get pointsModifier
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

            // Check if totals need updating
            const needsTotalUpdate =
                characterRecord.total_achievements !==
                    characterRecord.achievements.length ||
                characterRecord.completed_achievements !==
                    completedAchievements.length ||
                characterRecord.total_points !== totalPoints;

            if (needsTotalUpdate) {
                characterRecord.total_achievements =
                    characterRecord.achievements.length;
                characterRecord.completed_achievements =
                    completedAchievements.length;
                characterRecord.total_points = totalPoints;
                characterRecord.last_calculated = new Date();
                if (characterName) {
                    characterRecord.character_name = characterName;
                }

                await characterRecord.save();
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
     * Get achievement leaderboard by total points
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
     * Replace {{character_id}} placeholder in query with actual character ID
     */
    private static replaceCharacterIdInQuery(
        query: PipelineStage[],
        characterId: number
    ): PipelineStage[] {
        const queryString = JSON.stringify(query);
        // Replace the placeholder with the actual number (not as a string)
        const replacedString = queryString.replace(
            /"{{character_id}}"/g,
            characterId.toString()
        );
        return JSON.parse(replacedString);
    }

    /**
     * Build faceted aggregation pipeline for achievements
     * Groups similar achievements to reduce database round trips
     */
    private static buildFacetedAchievementPipeline(
        achievements: IAchievement[],
        characterId: number
    ): PipelineStage[] {
        const facets: Record<string, any[]> = {};
        const achievementMap: Record<string, string> = {}; // Maps facet keys back to achievement IDs

        // Create facets for all achievements
        for (const achievement of achievements) {
            // Skip achievements without query (temporal achievements with customFunction)
            if (!achievement.query) continue;
            
            // Create a unique key for this achievement to identify it in results
            const facetKey = `achievement_${achievement.id}`;
            achievementMap[facetKey] = achievement.id;

            // Replace placeholder and create the facet pipeline
            let pipeline = this.replaceCharacterIdInQuery(
                achievement.query,
                characterId
            );

            // All achievements now just return count - no need for killmail IDs
            facets[facetKey] = pipeline;
        }

        return [
            {
                $match: {
                    $or: [
                        { "victim.character_id": characterId },
                        { "attackers.character_id": characterId },
                    ],
                },
            },
            {
                $facet: facets,
            } as PipelineStage,
        ];
    }

    /**
     * Test a single achievement for a character
     * Useful for debugging and testing specific achievements without running all of them
     */
    static async testSingleAchievement(
        characterId: number,
        achievementId: string
    ): Promise<{
        count: number;
        killmailIds: number[];
        achievement: IAchievement | null;
    }> {
        try {
            const allAchievements = await this.getAllAchievements();
            const achievement = allAchievements.find(
                (a) => a.id === achievementId
            );

            if (!achievement) {
                console.log(
                    `❌ Achievement with ID "${achievementId}" not found`
                );
                return { count: 0, killmailIds: [], achievement: null };
            }

            if (!achievement.isActive) {
                console.log(`⚠️  Achievement "${achievementId}" is not active`);
                return { count: 0, killmailIds: [], achievement };
            }

            let count = 0;
            let killmailIds: number[] = [];

            // Handle achievements with custom functions (like temporal achievements)
            if (achievement.customFunction) {
                console.log(
                    `� Running custom function for achievement: ${achievement.name}`
                );
                const result = await achievement.customFunction(characterId);
                if (typeof result === "number") {
                    count = result;
                } else {
                    count = result.count;
                    killmailIds = result.killmailIds;
                }
            } else {
                console.log(
                    `🔍 Running query for achievement: ${achievement.name}`
                );
                
                // Skip achievements without query (should not happen here, but safety check)
                if (!achievement.query) {
                    console.log(`⚠️ Achievement ${achievement.name} has no query, skipping`);
                    count = 0;
                } else {
                    // Replace placeholder in query with actual character ID
                    const query = this.replaceCharacterIdInQuery(
                        achievement.query,
                        characterId
                    );

                    // Execute the aggregation query
                    const queryResult = await Killmails.aggregate(query, {
                        allowDiskUse: true,
                    });
                    const resultKeys =
                        queryResult.length > 0 ? Object.keys(queryResult[0]) : [];

                    // Default handling for regular count results
                    if (queryResult.length > 0) {
                        const result = queryResult[0];
                        count =
                            resultKeys.length > 0 ? result[resultKeys[0]!] || 0 : 0;
                    }
                }
            }

            // All achievements return empty killmailIds array - can be recreated via search
            killmailIds = [];

            console.log(`📊 Achievement "${achievement.name}" result: ${count}`);

            return { count, killmailIds, achievement };
        } catch (error) {
            console.error(
                `Error testing achievement ${achievementId} for character ${characterId}:`,
                error
            );
            return { count: 0, killmailIds: [], achievement: null };
        }
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
}
