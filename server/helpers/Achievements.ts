import type { PipelineStage } from "mongoose";
import { CharacterAchievements } from "../models/CharacterAchievements";
import { Killmails } from "../models/Killmails";
import { InvGroups } from "../models/InvGroups";

/**
 * Achievement definition interface
 */
export interface IAchievement {
    id: string;
    name: string;
    description: string;
    type: "pvp" | "pve" | "exploration" | "industry" | "special";
    points: number;
    rarity: "common" | "uncommon" | "rare" | "epic" | "legendary";
    icon?: string;
    category: string;
    query: PipelineStage[];
    threshold?: number; // For achievements that require multiple occurrences
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
        rarity: "rare",
        category: "High Value Targets",
        threshold: 1,
        isActive: true,
        query: [
            {
                $match: {
                    is_npc: false,
                    "victim.ship_group_id": {
                        $in: [547, 485, 513, 902, 941, 30, 659],
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
        rarity: "epic",
        category: "High Value Targets",
        threshold: 10,
        isActive: true,
        query: [
            {
                $match: {
                    is_npc: false,
                    "victim.ship_group_id": { $in: [547, 485] },
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

    // === SHIP TYPE SPECIFIC ACHIEVEMENTS ===
    {
        id: "frigate_killer",
        name: "Frigate Hunter",
        description: "Destroy 100 frigates.",
        type: "pvp",
        points: 25,
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
            // Get all ship groups (category_id: 6 is for ships)
            const shipGroups = await InvGroups.find({
                category_id: 6,
                published: true,
            }).lean();
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
     */
    private static async getAllAchievements(): Promise<IAchievement[]> {
        const shipTypeAchievements = await this.generateShipTypeAchievements();
        return [...achievements, ...shipTypeAchievements];
    }

    /**
     * Initialize achievements for a new character
     */
    static async initializeCharacter(
        characterId: number,
        characterName?: string
    ) {
        const existingRecord = await CharacterAchievements.findOne({
            character_id: characterId,
        });
        if (existingRecord) {
            return existingRecord;
        }

        const allAchievements = await this.getAllAchievements();
        const activeAchievements = allAchievements.filter(
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
                    characterName
                );
            }
        }

        // If no activity, no need to calculate anything further
        if (hasActivity === 0) {
            return characterRecord;
        }

        const allAchievements = await this.getAllAchievements();
        const updates: any = {};
        let hasUpdates = false;

        // Process each active achievement
        for (const achievement of allAchievements.filter((a) => a.isActive)) {
            try {
                // Replace placeholder in query with actual character ID
                const query = this.replaceCharacterIdInQuery(
                    achievement.query,
                    characterId
                );

                // Execute the aggregation query
                const result = await Killmails.aggregate(query);
                const count =
                    result.length > 0
                        ? result[0][Object.keys(result[0])[0]] || 0
                        : 0;

                // Find existing achievement in character record
                const existingAchievementIndex =
                    characterRecord.achievements.findIndex(
                        (a) => a.achievement_id === achievement.id
                    );

                if (existingAchievementIndex >= 0) {
                    const existingAchievement =
                        characterRecord.achievements[existingAchievementIndex];
                    const wasCompleted = existingAchievement.is_completed;
                    const isCompleted = count >= (achievement.threshold || 1);
                    
                    // Calculate completion tiers (how many times they've earned this achievement)
                    const newCompletionTiers = Math.floor(count / (achievement.threshold || 1));
                    const oldCompletionTiers = existingAchievement.completion_tiers || 0;

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
            } catch (error) {
                console.error(
                    `Error calculating achievement ${achievement.id} for character ${characterId}:`,
                    error
                );
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
                // Calculate total points based on completion tiers (each tier = full points)
                const totalPoints = updatedRecord.achievements.reduce(
                    (sum, achievement) => sum + (achievement.points * (achievement.completion_tiers || 0)),
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
            // Calculate total points based on completion tiers (each tier = full points)
            const totalPoints = characterRecord.achievements.reduce(
                (sum, achievement) => sum + (achievement.points * (achievement.completion_tiers || 0)),
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
