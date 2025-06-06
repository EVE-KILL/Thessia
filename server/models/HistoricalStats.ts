// models/HistoricalStats.ts

import { type Document, type Model, Schema, model } from "mongoose";
import { cliLogger } from "~/server/helpers/Logger";
import type { IHistoricalStats } from "~/server/interfaces/IHistoricalStats"; // Adjust the path as necessary

// Extend the IHistoricalStats interface with Mongoose's Document interface
export interface IHistoricalStatsDocument extends IHistoricalStats, Document { }

// Define the Alliances schema
const historicalStatsSchema = new Schema<IHistoricalStatsDocument>(
    {
        alliance_id: { type: Number, required: true },
        corporation_id: { type: Number, required: true },
        count: { type: Number, required: true },
        previousCount: { type: Number },
        date: { type: Date, required: true },
        sum_sec_status: { type: Number },
        avg_sec_status: { type: Number },  // Added average security status
        pirate_members: { type: Number },
        carebear_members: { type: Number },
        neutral_members: { type: Number },
        // Add pre-calculated change fields
        change_1d: { type: Number },
        change_7d: { type: Number },
        change_14d: { type: Number },
        change_30d: { type: Number },
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
historicalStatsSchema.index({ createdAt: 1 }, { sparse: true });
historicalStatsSchema.index({ updatedAt: 1 }, { sparse: true });
historicalStatsSchema.index({ count: 1 }, { sparse: true });
historicalStatsSchema.index({ pirate_members: -1 }, { sparse: true });
historicalStatsSchema.index({ carebear_members: -1 }, { sparse: true });
// Add indexes for the new pre-calculated change fields
historicalStatsSchema.index({ change_1d: -1 }, { sparse: true });
historicalStatsSchema.index({ change_7d: -1 }, { sparse: true });
historicalStatsSchema.index({ change_14d: -1 }, { sparse: true });
historicalStatsSchema.index({ change_30d: -1 }, { sparse: true });
// Add index for avg_sec_status
historicalStatsSchema.index({ avg_sec_status: 1 }, { sparse: true });
// Add shard key index
historicalStatsSchema.index({ alliance_id: "hashed" });
// Keep compound indexes
historicalStatsSchema.index({ alliance_id: 1, count: -1 }, { sparse: true });
historicalStatsSchema.index({ corporation_id: 1, count: -1 }, { sparse: true });
historicalStatsSchema.index({ alliance_id: 1, pirate_members: -1 }, { sparse: true });
historicalStatsSchema.index({ corporation_id: 1, pirate_members: -1 }, { sparse: true });
historicalStatsSchema.index({ alliance_id: 1, carebear_members: -1 }, { sparse: true });
historicalStatsSchema.index({ corporation_id: 1, carebear_members: -1 }, { sparse: true });
// Add compound indexes for changes
historicalStatsSchema.index({ alliance_id: 1, change_1d: -1 }, { sparse: true });
historicalStatsSchema.index({ corporation_id: 1, change_1d: -1 }, { sparse: true });
historicalStatsSchema.index({ alliance_id: 1, change_7d: -1 }, { sparse: true });
historicalStatsSchema.index({ corporation_id: 1, change_7d: -1 }, { sparse: true });
historicalStatsSchema.index({ alliance_id: 1, change_14d: -1 }, { sparse: true });
historicalStatsSchema.index({ corporation_id: 1, change_14d: -1 }, { sparse: true });
historicalStatsSchema.index({ alliance_id: 1, change_30d: -1 }, { sparse: true });
historicalStatsSchema.index({ corporation_id: 1, change_30d: -1 }, { sparse: true });

// Create and export the Alliances model
export const HistoricalStats: Model<IHistoricalStatsDocument> = model<IHistoricalStatsDocument>(
    "historical_stats",
    historicalStatsSchema,
    "historical_stats",
);

// Add the sharding configuration for HistoricalStats collection
export const setupHistoricalStatsSharding = async () => {
    try {
        const { enableSharding } = await import("~/server/helpers/Mongoose");
        const dbName = HistoricalStats.db.name;

        // Use hashed alliance_id as shard key (part of unique index)
        const shardKey = { alliance_id: "hashed" } as any;

        // Ensure the shard key has an index
        await HistoricalStats.collection.createIndex(shardKey);

        // Enable sharding
        return await enableSharding(dbName, "historical_stats", shardKey);
    } catch (error) {
        cliLogger.error(`Error setting up HistoricalStats sharding: ${error}`);
        return false;
    }
};
