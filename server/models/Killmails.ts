// models/Killmails.ts

import { type Document, type Model, Schema, model } from "mongoose";
import { cliLogger } from "~/server/helpers/Logger";
import type { IAttacker, IItem, IKillmail, IVictim } from "~/server/interfaces/IKillmail"; // Adjust the path as necessary

export interface IKillmailDocument extends IKillmail, Document { }

const attackerSchema = new Schema<IAttacker>(
    {
        ship_id: { type: Number },
        ship_name: { type: Object },
        ship_group_id: { type: Number },
        ship_group_name: { type: Object },
        character_id: { type: Number },
        character_name: { type: String },
        corporation_id: { type: Number },
        corporation_name: { type: String },
        alliance_id: { type: Number },
        alliance_name: { type: String },
        faction_id: { type: Number },
        faction_name: { type: String },
        security_status: { type: Number },
        damage_done: { type: Number },
        final_blow: { type: Boolean },
        weapon_type_id: { type: Number },
        weapon_type_name: { type: Object },
    },
    { _id: false },
);

const itemSchema = new Schema<IItem>(
    {
        type_id: { type: Number },
        name: { type: Object },
        group_id: { type: Number },
        group_name: { type: Object },
        category_id: { type: Number },
        flag: { type: Number },
        qty_dropped: { type: Number },
        qty_destroyed: { type: Number },
        singleton: { type: Number },
        value: { type: Number },
    },
    { _id: false },
);
itemSchema.add({
    items: { type: [itemSchema], default: undefined, required: false },
});

const victimSchema = new Schema<IVictim>(
    {
        ship_id: { type: Number },
        ship_name: { type: Object },
        ship_group_id: { type: Number },
        ship_group_name: { type: Object },
        damage_taken: { type: Number },
        character_id: { type: Number },
        character_name: { type: String },
        corporation_id: { type: Number },
        corporation_name: { type: String },
        alliance_id: { type: Number },
        alliance_name: { type: String },
        faction_id: { type: Number },
        faction_name: { type: String },
    },
    { _id: false },
);

const killmailsSchema = new Schema<IKillmailDocument>(
    {
        killmail_hash: { type: String },
        killmail_id: { type: Number },
        attackers: { type: [attackerSchema] },
        dna: { type: String },
        fitting_value: { type: Number },
        is_npc: { type: Boolean },
        is_solo: { type: Boolean },
        items: { type: [itemSchema] },
        kill_time: { type: Date },
        kill_time_str: { type: String },
        near: { type: String },
        region_id: { type: Number },
        region_name: { type: Object },
        ship_value: { type: Number },
        system_id: { type: Number },
        system_name: { type: String },
        system_security: { type: Number },
        constellation_id: { type: Number },
        constellation_name: { type: String },
        total_value: { type: Number },
        victim: { type: victimSchema },
        war_id: { type: Number },
        x: { type: Number },
        y: { type: Number },
        z: { type: Number },
    },
    {
        collection: "killmails",
        timestamps: true,
        toJSON: {
            transform: (_doc, ret) => {
                delete ret._id;
                delete ret.__v;
            },
        },
    },
);

// Updated index definitions focusing on most common query patterns and removing rarely used ones
const indexes = [
    // Core indexes - keep these
    { fields: { killmail_id: -1, killmail_hash: -1 }, options: { unique: true } },
    { fields: { kill_time: -1 }, options: { sparse: true } },
    { fields: { createdAt: -1 }, options: { sparse: true } },
    { fields: { updatedAt: -1 }, options: { sparse: true } },

    // Victim entity indexes - highly used in queries
    { fields: { "victim.character_id": -1, kill_time: -1 }, options: { sparse: true } },
    { fields: { "victim.corporation_id": -1, kill_time: -1 }, options: { sparse: true } },
    { fields: { "victim.alliance_id": -1, kill_time: -1 }, options: { sparse: true } },
    { fields: { "victim.ship_id": -1, kill_time: -1 }, options: { sparse: true } },
    { fields: { "victim.ship_group_id": -1, kill_time: -1 }, options: { sparse: true } },

    // Optimized index for T1 ships
    {
        fields: { "victim.ship_group_id": 1, kill_time: -1 }, options: {
            partialFilterExpression: { "victim.ship_group_id": { $in: [419, 27, 29, 547, 26, 420, 25, 28, 941, 463, 237, 31] } },
            name: "victim.ship_group_id_t1_kill_time_-1"
        }
    },
    // Optimized index for T2 ships
    {
        fields: { "victim.ship_group_id": 1, kill_time: -1 }, options: {
            partialFilterExpression: { "victim.ship_group_id": { $in: [324, 898, 906, 540, 830, 893, 543, 541, 833, 358, 894, 831, 902, 832, 900, 834, 380] } },
            name: "victim.ship_group_id_t2_kill_time_-1"
        }
    },
    // Optimized index for T3 ships
    {
        fields: { "victim.ship_group_id": 1, kill_time: -1 }, options: {
            partialFilterExpression: { "victim.ship_group_id": { $in: [963, 1305] } },
            name: "victim.ship_group_id_t3_kill_time_-1"
        }
    },
    // Optimized index for frigates
    {
        fields: { "victim.ship_group_id": 1, kill_time: -1 }, options: {
            partialFilterExpression: { "victim.ship_group_id": { $in: [324, 893, 25, 831, 237] } },
            name: "victim.ship_group_id_frigate_kill_time_-1"
        }
    },
    // Optimized index for cruisers
    {
        fields: { "victim.ship_group_id": 1, kill_time: -1 }, options: {
            partialFilterExpression: { "victim.ship_group_id": { $in: [906, 26, 833, 358, 894, 832, 963] } },
            name: "victim.ship_group_id_cruiser_kill_time_-1"
        }
    },
    // Optimized index for destroyers
    {
        fields: { "victim.ship_group_id": 1, kill_time: -1 }, options: {
            partialFilterExpression: { "victim.ship_group_id": { $in: [420, 541] } },
            name: "victim.ship_group_id_destroyer_kill_time_-1"
        }
    },
    // Optimized index for battlecruisers
    {
        fields: { "victim.ship_group_id": 1, kill_time: -1 }, options: {
            partialFilterExpression: { "victim.ship_group_id": { $in: [419, 540] } },
            name: "victim.ship_group_id_battlecruiser_kill_time_-1"
        }
    },
    // Optimized index for battleships
    {
        fields: { "victim.ship_group_id": 1, kill_time: -1 }, options: {
            partialFilterExpression: { "victim.ship_group_id": { $in: [27, 898, 900] } },
            name: "victim.ship_group_id_battleship_kill_time_-1"
        }
    },
    // Optimized index for capitals
    {
        fields: { "victim.ship_group_id": 1, kill_time: -1 }, options: {
            partialFilterExpression: { "victim.ship_group_id": { $in: [547, 485] } },
            name: "victim.ship_group_id_capital_kill_time_-1"
        }
    },
    // Optimized index for freighters
    {
        fields: { "victim.ship_group_id": 1, kill_time: -1 }, options: {
            partialFilterExpression: { "victim.ship_group_id": { $in: [513, 902] } },
            name: "victim.ship_group_id_freighter_kill_time_-1"
        }
    },
    // Optimized index for supercarriers
    {
        fields: { "victim.ship_group_id": 1, kill_time: -1 }, options: {
            partialFilterExpression: { "victim.ship_group_id": { $in: [659] } },
            name: "victim.ship_group_id_supercarrier_kill_time_-1"
        }
    },
    // Optimized index for titans
    {
        fields: { "victim.ship_group_id": 1, kill_time: -1 }, options: {
            partialFilterExpression: { "victim.ship_group_id": { $in: [30] } },
            name: "victim.ship_group_id_titan_kill_time_-1"
        }
    },
    // Optimized index for citadels
    {
        fields: { "victim.ship_group_id": 1, kill_time: -1 }, options: {
            partialFilterExpression: { "victim.ship_group_id": { $in: [1657, 1406, 1404, 1408, 2017, 2016] } },
            name: "victim.ship_group_id_citadel_kill_time_-1"
        }
    },
    // Optimized index for "big" ships (combined capitals, supercarriers, titans)
    {
        fields: { "victim.ship_group_id": 1, kill_time: -1 }, options: {
            partialFilterExpression: { "victim.ship_group_id": { $in: [547, 485, 513, 902, 941, 30, 659] } },
            name: "victim.ship_group_id_big_kill_time_-1"
        }
    },

    // Optimized security level indexes
    {
        fields: { system_security: 1, kill_time: -1 }, options: {
            partialFilterExpression: { system_security: { $gte: 0.45 } },
            name: "system_security_highsec_kill_time_-1"
        }
    },
    {
        fields: { system_security: 1, kill_time: -1 }, options: {
            partialFilterExpression: { system_security: { $lte: 0.45, $gte: 0 } },
            name: "system_security_lowsec_kill_time_-1"
        }
    },
    {
        fields: { system_security: 1, kill_time: -1 }, options: {
            partialFilterExpression: { system_security: { $lte: 0 } },
            name: "system_security_nullsec_kill_time_-1"
        }
    },

    // Attacker entity indexes - highly used in queries
    { fields: { "attackers.character_id": -1, kill_time: -1 }, options: { sparse: true } },
    { fields: { "attackers.corporation_id": -1, kill_time: -1 }, options: { sparse: true } },
    { fields: { "attackers.alliance_id": -1, kill_time: -1 }, options: { sparse: true } },
    { fields: { "attackers.ship_id": -1, kill_time: -1 }, options: { sparse: true } },

    // Additional indexes for stats calculations
    // Optimized index for sampling operations - single field to keep it light
    { fields: { "attackers.ship_id": 1 }, options: { sparse: true } },
    { fields: { "victim.ship_id": 1 }, options: { sparse: true } },

    // Specialized indexes for the stats aggregation pipelines
    { fields: { "attackers.character_id": 1, "attackers.ship_id": 1, kill_time: -1 }, options: { sparse: true } },
    { fields: { "attackers.corporation_id": 1, "attackers.ship_id": 1, kill_time: -1 }, options: { sparse: true } },
    { fields: { "attackers.alliance_id": 1, "attackers.ship_id": 1, kill_time: -1 }, options: { sparse: true } },

    // Item/fitting related indexes
    { fields: { "items.type_id": -1, kill_time: -1 }, options: { sparse: true } },

    // Location indexes
    { fields: { system_security: -1 }, options: { sparse: true } },
    { fields: { system_id: -1, kill_time: -1 }, options: { sparse: true } },
    { fields: { region_id: -1, kill_time: -1 }, options: { sparse: true } },
    { fields: { constellation_id: -1, kill_time: -1 }, options: { sparse: true } },
    { fields: { system_security: -1, kill_time: -1 }, options: { sparse: true } },

    // Feature-based filters
    { fields: { is_npc: -1, kill_time: -1 }, options: { sparse: true } },
    { fields: { is_solo: -1, kill_time: -1 }, options: { sparse: true } },
    { fields: { total_value: -1, kill_time: -1 }, options: { sparse: true } },

    // Spatial queries
    { fields: { system_id: -1, x: -1, y: -1, z: -1 }, options: { sparse: true } },
    // Specific Query Optimizations
    { fields: { "victim.character_id": 1, "system_id": 1, "kill_time": -1 }, options: { sparse: true } },
    { fields: { "victim.ship_group_id": 1, "total_value": -1, "kill_time": -1 }, options: { sparse: true } },

    // For Query Builder - Attacker fields often filtered with kill_time sort
    { fields: { "attackers.ship_group_id": -1, "kill_time": -1 }, options: { sparse: true } },
    { fields: { "attackers.faction_id": -1, "kill_time": -1 }, options: { sparse: true } },
    { fields: { "attackers.weapon_type_id": -1, "kill_time": -1 }, options: { sparse: true } },
];

for (const { fields, options } of indexes) {
    killmailsSchema.index(fields as any, options);
}

export const Killmails: Model<IKillmailDocument> = model<IKillmailDocument>(
    "killmails",
    killmailsSchema,
    "killmails",
);

// Optional: you can listen for errors on index creation
killmailsSchema.on("index", (error) => {
    if (error) {
        console.error("Killmails index error:", error);
    }
});

// After creating the model, compute allowed index names from our definitions.
// The auto-generated name is computed by concatenating each key and its value in order.
const computeIndexName = (fields: Record<string, number>) =>
    Object.entries(fields)
        .map(([key, val]) => `${key}_${val}`)
        .join("_");

const allowedIndexNames = new Set(indexes.map((idx) => computeIndexName(idx.fields)));

// Drop any index on the collection that doesn't match the allowed names (except _id)
Killmails.collection
    .indexes()
    .then(async (currentIndexes) => {
        for (const idx of currentIndexes) {
            if (idx.name !== "_id_" && !allowedIndexNames.has(idx.name)) {
                try {
                    //await Killmails.collection.dropIndex(idx.name);
                    //cliLogger.info(`Dropped index ${idx.name}`);
                } catch (err) {
                    //console.error(`Error dropping index ${idx.name}:`, err);
                }
            }
        }
    })
    .catch((err) => {
        console.error("Error fetching indexes:", err);
    });
