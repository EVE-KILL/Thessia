// models/Alliances.ts

import { Schema, model, type Document, type Model } from "mongoose";
import type { IAlliance } from "../interfaces/IAlliance"; // Adjust the path as necessary

// Extend the IAlliance interface with Mongoose's Document interface
export interface IAllianceDocument extends IAlliance, Document {}

// Define the Alliances schema
const alliancesSchema = new Schema<IAllianceDocument>(
  {
    alliance_id: { type: Number, unique: true }, // Unique identifier for the alliance
    name: { type: String }, // Name of the alliance
    ticker: { type: String }, // Ticker symbol of the alliance
    creator_id: { type: Number }, // ID of the alliance creator
    creator_corporation_id: { type: Number }, // ID of the creator's corporation
    executor_corporation_id: { type: Number }, // ID of the executor's corporation
    date_founded: { type: Date }, // Date the alliance was founded
    // Timestamps are automatically added by Mongoose
  },
  {
    collection: "alliances",
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
alliancesSchema.index({ name: 1 }, { sparse: true }); // Sparse index on name
alliancesSchema.index({ ticker: 1 }, { sparse: true }); // Sparse index on ticker
alliancesSchema.index({ creator_id: 1 }, { sparse: true }); // Sparse index on creator_id
alliancesSchema.index({ creator_corporation_id: 1 }, { sparse: true }); // Sparse index on creator_corporation_id
alliancesSchema.index({ executor_corporation_id: 1 }, { sparse: true }); // Sparse index on executor_corporation_id
alliancesSchema.index({ createdAt: 1 }, { sparse: true }); // Sparse index on createdAt
alliancesSchema.index({ updatedAt: 1 }, { sparse: true }); // Sparse index on updatedAt

// Create and export the Alliances model
export const Alliances: Model<IAllianceDocument> = model<IAllianceDocument>(
  "alliances",
  alliancesSchema,
  "alliances", // Explicitly specifying the collection name
);
