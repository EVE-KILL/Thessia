// models/Characters.ts

import { Schema, model, type Document, type Model } from "mongoose";
import type { ICharacter, ICharacterHistory } from "../interfaces/ICharacter"; // Adjust the path as necessary

// Extend the ICharacter interface with Mongoose's Document interface
export interface ICharacterDocument extends ICharacter, Document {}

// Define the schema for Character History
const characterHistorySchema = new Schema<ICharacterHistory>(
  {
    record_id: { type: Number },
    corporation_id: { type: Number },
    start_date: { type: Date },
  },
  { _id: false }, // Prevents automatic creation of _id for subdocuments
);

// Define the main Characters schema
const charactersSchema = new Schema<ICharacterDocument>(
  {
    character_id: { type: Number, unique: true }, // Unique identifier for the character
    name: { type: String }, // Name of the character
    description: { type: String }, // Description of the character
    birthday: { type: Date }, // Birthday of the character
    gender: { type: String }, // Gender of the character
    race_id: { type: Number }, // Race ID
    security_status: { type: Number }, // Security status
    bloodline_id: { type: Number }, // Bloodline ID
    corporation_id: { type: Number }, // Corporation ID
    alliance_id: { type: Number }, // Alliance ID
    faction_id: { type: Number }, // Faction ID
    history: { type: [characterHistorySchema] }, // History array
    deleted: { type: Boolean, default: false }, // Deleted flag
    error: { type: String }, // Error message (optional)
    last_active: { type: Date }, // Last active timestamp
    // Timestamps are automatically added by Mongoose
  },
  {
    collection: "characters",
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
charactersSchema.index({ name: 1 }, { sparse: true }); // Sparse index on name
charactersSchema.index({ corporation_id: 1 }, { sparse: true }); // Sparse index on corporation_id
charactersSchema.index({ alliance_id: 1 }, { sparse: true }); // Sparse index on alliance_id
charactersSchema.index({ faction_id: 1 }, { sparse: true }); // Sparse index on faction_id
charactersSchema.index({ last_active: 1 }, { sparse: true }); // Sparse index on last_active
charactersSchema.index({ createdAt: 1 }, { sparse: true }); // Sparse index on createdAt
charactersSchema.index({ updatedAt: 1 }, { sparse: true }); // Sparse index on updatedAt

// Create and export the Characters model
export const Characters: Model<ICharacterDocument> = model<ICharacterDocument>(
  "characters",
  charactersSchema,
  "characters", // Explicitly specifying the collection name
);
