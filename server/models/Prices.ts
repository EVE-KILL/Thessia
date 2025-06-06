// models/Prices.ts

import { type Document, type Model, Schema, model } from "mongoose";
import { cliLogger } from "~/server/helpers/Logger";
import type { IPrice } from "~/server/interfaces/IPrice"; // Adjust the path as necessary

export interface IPriceDocument extends IPrice, Document { }

const priceSchema = new Schema<IPriceDocument>(
    {
        type_id: { type: Number },
        average: { type: Number },
        highest: { type: Number },
        lowest: { type: Number },
        region_id: { type: Number },
        order_count: { type: Number },
        volume: { type: Number },
        date: { type: Date },
        updatedAt: { type: Date },
        createdAt: { type: Date },
    },
    {
        collection: "prices",
        timestamps: true,
        toJSON: {
            transform: (_doc, ret) => {
                delete ret._id;
                delete ret.__v;
            },
        },
    },
);

// Define indexes for the schema
priceSchema.index({ type_id: 1, region_id: 1, date: 1 }, { unique: true });
priceSchema.index({ region_id: 1 }, { sparse: true });
priceSchema.index({ date: 1 }, { sparse: true });
priceSchema.index({ type_id: "hashed" });

export const Prices: Model<IPriceDocument> = model<IPriceDocument>("prices", priceSchema, "prices");

// Add the sharding configuration for Prices collection
export const setupPricesSharding = async () => {
    try {
        const { enableSharding } = await import("~/server/helpers/Mongoose");
        const dbName = Prices.db.name;

        // Use hashed type_id as shard key (part of unique index)
        const shardKey = { type_id: "hashed" } as any;

        // Ensure the shard key has an index
        await Prices.collection.createIndex(shardKey);

        // Enable sharding
        return await enableSharding(dbName, "prices", shardKey);
    } catch (error) {
        cliLogger.error(`Error setting up Prices sharding: ${error}`);
        return false;
    }
};
