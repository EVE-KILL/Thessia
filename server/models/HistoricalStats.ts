// models/HistoricalStats.ts

import { Schema, model, type Document, type Model } from "mongoose";
import type { IHistoricalStats } from "../interfaces/IHistoricalStats"; // Adjust the path as necessary

// Extend the IHistoricalStats interface with Mongoose's Document interface
export interface IHistoricalStatsDocument extends IHistoricalStats, Document {}

// Define the Alliances schema
const historicalStatsSchema = new Schema<IHistoricalStatsDocument>(
  {
    alliance_id: { type: Number, required: true },
    corporation_id: { type: Number, required: true },
    count: { type: Number, required: true },
    previousCount: { type: Number },
    date: { type: Date, required: true },
    historicalCounts: [
      {
        count: { type: Number, required: true },
        date: { type: Date, required: true },
      },
    ],
    updatedAt: { type: Date },
    createdAt: { type: Date },
  },
  {
    collection: "historical_stats",
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
historicalStatsSchema.index({ alliance_id: 1, corporation_id: 1 }, { unique: true });
historicalStatsSchema.index({ alliance_id: 1 }, { sparse: true });
historicalStatsSchema.index({ corporation_id: 1 }, { sparse: true });
historicalStatsSchema.index({ date: 1 }, { sparse: true });
historicalStatsSchema.index({ createdAt: 1 }, { sparse: true }); // Sparse index on createdAt
historicalStatsSchema.index({ updatedAt: 1 }, { sparse: true }); // Sparse index on updatedAt

// Create and export the Alliances model
export const HistoricalStats: Model<IHistoricalStatsDocument> = model<IHistoricalStatsDocument>(
  "historical_stats",
  historicalStatsSchema,
  "historical_stats",
);
