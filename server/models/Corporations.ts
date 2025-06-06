// models/Corporations.ts

import { type Document, type Model, Schema, model } from "mongoose";
import { cliLogger } from "~/server/helpers/Logger";
import { Meilisearch } from "~/server/helpers/Meilisearch";
import type { ICorporation, ICorporationHistory } from "~/server/interfaces/ICorporation"; // Adjust the path as necessary

// Extend the ICorporation interface with Mongoose's Document interface
export interface ICorporationDocument extends ICorporation, Document { }

// Define the schema for Corporation History
const corporationHistorySchema = new Schema<ICorporationHistory>(
    {
        record_id: { type: Number },
        alliance_id: { type: Number },
        start_date: { type: Date },
    },
    { _id: false }, // Prevents automatic creation of _id for subdocuments
);

// Define the main Corporations schema
const corporationsSchema = new Schema<ICorporationDocument>(
    {
        corporation_id: { type: Number, unique: true }, // Unique identifier for the corporation
        name: { type: String }, // Name of the corporation
        ticker: { type: String }, // Ticker symbol of the corporation
        description: { type: String }, // Description of the corporation
        date_founded: { type: Date }, // Founding date
        alliance_id: { type: Number }, // Alliance ID
        faction_id: { type: Number }, // Faction ID
        faction_name: { type: String }, // Faction name
        ceo_id: { type: Number }, // CEO ID
        creator_id: { type: Number }, // Creator ID
        home_station_id: { type: Number }, // Home station ID
        home_station_name: { type: String }, // Home station name
        member_count: { type: Number }, // Number of members
        shares: { type: Number }, // Shares
        tax_rate: { type: Number }, // Tax rate
        url: { type: String }, // URL
        history: { type: [corporationHistorySchema] }, // History array
        deleted: { type: Boolean, default: false }, // Deleted flag
        error: { type: String }, // Error message (optional)
        // Timestamps are automatically added by Mongoose
    },
    {
        collection: "corporations",
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
corporationsSchema.index({ name: 1 }, { sparse: true }); // Sparse index on name
corporationsSchema.index({ ticker: 1 }, { sparse: true }); // Sparse index on ticker
corporationsSchema.index({ alliance_id: 1 }, { sparse: true }); // Sparse index on alliance_id
corporationsSchema.index({ faction_id: 1 }, { sparse: true }); // Sparse index on faction_id
corporationsSchema.index({ createdAt: 1 }, { sparse: true }); // Sparse index on createdAt
corporationsSchema.index({ updatedAt: 1 }, { sparse: true }); // Sparse index on updatedAt
corporationsSchema.index({ corporation_id: "hashed" }); // Add shard key index to indexes

// Hook to update Meilisearch on new document save
corporationsSchema.post<ICorporationDocument>('save', async function (doc) {
    if (this.isNew) {
        try {
            const meilisearch = new Meilisearch();
            const corporationDocument = {
                id: doc.corporation_id,
                name: doc.name,
                ticker: doc.ticker,
                type: 'corporation',
                rank: 6,
                lang: 'all',
            };
            await meilisearch.addDocuments('nitro', [corporationDocument]);
            cliLogger.info(`Indexed new corporation ${doc.corporation_id} in Meilisearch`);
        } catch (error) {
            cliLogger.error(`Error indexing new corporation ${doc.corporation_id} in Meilisearch: ${error}`);
        }
    }
});

// Create and export the Corporations model
export const Corporations: Model<ICorporationDocument> = model<ICorporationDocument>(
    "corporations",
    corporationsSchema,
    "corporations", // Explicitly specifying the collection name
);

// Add the sharding configuration for Corporations collection
export const setupCorporationsSharding = async () => {
    try {
        const { enableSharding } = await import("~/server/helpers/Mongoose");
        const dbName = Corporations.db.name;

        // Use hashed corporation_id as shard key
        const shardKey = { corporation_id: "hashed" } as any;

        // Ensure the shard key has an index
        await Corporations.collection.createIndex(shardKey);

        // Enable sharding
        return await enableSharding(dbName, "corporations", shardKey);
    } catch (error) {
        cliLogger.error(`Error setting up Corporations sharding: ${error}`);
        return false;
    }
};
