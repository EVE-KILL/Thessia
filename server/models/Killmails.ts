// models/Killmails.ts

import { type Document, type Model, Schema, model } from "mongoose";
import type { IAttacker, IItem, IKillmail, IVictim } from "../interfaces/IKillmail"; // Adjust the path as necessary

export interface IKillmailDocument extends IKillmail, Document {}

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

// Updated index definitions in descending order
const indexes = [
  { fields: { killmail_id: -1, killmail_hash: -1 }, options: { unique: true } },
  { fields: { kill_time: -1 }, options: { sparse: true } },
  { fields: { createdAt: -1 }, options: { sparse: true } },
  { fields: { updatedAt: -1 }, options: { sparse: true } },
  { fields: { "victim.character_id": -1, kill_time: -1 }, options: { sparse: true } },
  { fields: { "victim.corporation_id": -1, kill_time: -1 }, options: { sparse: true } },
  { fields: { "victim.alliance_id": -1, kill_time: -1 }, options: { sparse: true } },
  { fields: { "victim.faction_id": -1, kill_time: -1 }, options: { sparse: true } },
  { fields: { "victim.ship_id": -1, kill_time: -1 }, options: { sparse: true } },
  { fields: { "victim.ship_group_id": -1, kill_time: -1 }, options: { sparse: true } },
  { fields: { "attackers.character_id": -1, kill_time: -1 }, options: { sparse: true } },
  { fields: { "attackers.character_name": -1, kill_time: -1 }, options: { sparse: true } },
  { fields: { "attackers.corporation_id": -1, kill_time: -1 }, options: { sparse: true } },
  { fields: { "attackers.alliance_id": -1, kill_time: -1 }, options: { sparse: true } },
  { fields: { "attackers.faction_id": -1, kill_time: -1 }, options: { sparse: true } },
  { fields: { "attackers.ship_id": -1, kill_time: -1 }, options: { sparse: true } },
  { fields: { "attackers.ship_group_id": -1, kill_time: -1 }, options: { sparse: true } },
  { fields: { "attackers.weapon_type_id": -1, kill_time: -1 }, options: { sparse: true } },
  { fields: { "items.type_id": -1, kill_time: -1 }, options: { sparse: true } },
  { fields: { "items.group_id": -1, kill_time: -1 }, options: { sparse: true } },
  { fields: { war_id: -1, kill_time: -1 }, options: { sparse: true } },
  { fields: { system_id: -1, kill_time: -1 }, options: { sparse: true } },
  { fields: { region_id: -1, kill_time: -1 }, options: { sparse: true } },
  { fields: { constellation_id: -1, kill_time: -1 }, options: { sparse: true } },
  { fields: { system_security: -1, kill_time: -1 }, options: { sparse: true } },
  { fields: { is_npc: -1, kill_time: -1 }, options: { sparse: true } },
  { fields: { is_solo: -1, kill_time: -1 }, options: { sparse: true } },
  { fields: { total_value: -1, kill_time: -1 }, options: { sparse: true } },
  { fields: { x: -1, y: -1, z: -1, system_id: -1, kill_time: -1 }, options: { sparse: true } },
  // Note: indexes that don't match the generated name are omitted.
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
          await Killmails.collection.dropIndex(idx.name);
          console.log(`Dropped index ${idx.name}`);
        } catch (err) {
          console.error(`Error dropping index ${idx.name}:`, err);
        }
      }
    }
  })
  .catch((err) => {
    console.error("Error fetching indexes:", err);
  });
