import { type Document, type Model, Schema, model } from "mongoose";
import type {
  IESIAttacker,
  IESIKillmail,
  IESIVictim,
  IESIVictimItem,
} from "../interfaces/IESIKillmail";

// Extend the IESIKillmail interface with Mongoose's Document interface
export interface IESIKillmailDocument extends IESIKillmail, Document {}

// Subschema for Victim Items
const victimItemSchema = new Schema<IESIVictimItem>(
  {
    item_type_id: { type: Number },
    quantity_destroyed: { type: Number, default: 0 },
    quantity_dropped: { type: Number, default: 0 },
    flag: { type: Number },
    singleton: { type: Number },
  },
  { _id: false }, // Prevents automatic creation of _id for subdocuments
);
victimItemSchema.add({
  items: { type: [victimItemSchema], default: undefined, required: false },
});

// Subschema for Victims
const victimSchema = new Schema<IESIVictim>(
  {
    character_id: { type: Number },
    corporation_id: { type: Number },
    alliance_id: { type: Number },
    faction_id: { type: Number },
    damage_taken: { type: Number },
    ship_type_id: { type: Number },
    items: { type: [victimItemSchema], default: [] },
    position: {
      x: { type: Number },
      y: { type: Number },
      z: { type: Number },
    },
  },
  { _id: false },
);

// Subschema for Attackers
const attackerSchema = new Schema<IESIAttacker>(
  {
    character_id: { type: Number },
    corporation_id: { type: Number },
    alliance_id: { type: Number },
    faction_id: { type: Number },
    damage_done: { type: Number },
    final_blow: { type: Boolean },
    security_status: { type: Number },
    ship_type_id: { type: Number },
    weapon_type_id: { type: Number },
  },
  { _id: false },
);

// Main KillmailsESI schema
const killmailsESISchema = new Schema<IESIKillmailDocument>(
  {
    killmail_id: { type: Number },
    killmail_hash: { type: String },
    killmail_time: { type: Date },
    solar_system_id: { type: Number },
    attackers: { type: [attackerSchema] },
    victim: { type: victimSchema },
    processed: { type: Boolean, default: false },
  },
  {
    timestamps: true, // Automatically adds createdAt and updatedAt fields
    toJSON: {
      transform: (_doc, ret) => {
        delete ret._id; // Removes _id from the JSON output
        delete ret.__v; // Removes __v (version key) from the JSON output
      },
    },
  },
);

// Define indexes for the schema
killmailsESISchema.index({ killmail_id: 1, killmail_hash: 1 }, { unique: true });
killmailsESISchema.index({ killmail_time: -1 }, { sparse: true });
killmailsESISchema.index({ createdAt: 1 }, { sparse: true });
killmailsESISchema.index({ updatedAt: 1 }, { sparse: true });
killmailsESISchema.index({ processed: 1 }, { sparse: true });
killmailsESISchema.index({ killmail_time: -1, processed: 1 }, { sparse: true });

// Add indexes for attackers and victim (character_id, corporation_id and alliance_id)
killmailsESISchema.index({ "attackers.character_id": 1 }, { sparse: true });
killmailsESISchema.index({ "attackers.corporation_id": 1 }, { sparse: true });
killmailsESISchema.index({ "attackers.alliance_id": 1 }, { sparse: true });
killmailsESISchema.index({ "victim.character_id": 1 }, { sparse: true });
killmailsESISchema.index({ "victim.corporation_id": 1 }, { sparse: true });
killmailsESISchema.index({ "victim.alliance_id": 1 }, { sparse: true });

// Create and export the KillmailsESI model
export const KillmailsESI: Model<IESIKillmailDocument> = model<IESIKillmailDocument>(
  "killmails_esi",
  killmailsESISchema,
  "killmails_esi",
);

export type { IESIKillmailDocument as ESIKillmailDocument };
