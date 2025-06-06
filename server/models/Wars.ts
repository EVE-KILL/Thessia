import { type Document, type Model, Schema, model } from "mongoose";
import { cliLogger } from "~/server/helpers/Logger";
import type { IWar } from "~/server/interfaces/IWar";

export interface IWarDocument extends IWar, Document { }

const warsSchema = new Schema<IWarDocument>(
    {
        war_id: { type: Number, unique: true, required: true },
        declared: { type: Date, required: true },
        started: { type: Date, required: true },
        finished: { type: Date },
        retracted: { type: Date },
        mutual: { type: Boolean, required: true },
        open_for_allies: { type: Boolean, required: true },
        aggressor: {
            corporation_id: { type: Number, sparse: true },
            alliance_id: { type: Number, sparse: true },
            isk_destroyed: { type: Number, required: true },
            ships_killed: { type: Number, required: true },
        },
        defender: {
            corporation_id: { type: Number, sparse: true },
            alliance_id: { type: Number, sparse: true },
            isk_destroyed: { type: Number, required: true },
            ships_killed: { type: Number, required: true },
        },
        allies: [
            {
                corporation_id: { type: Number, sparse: true },
                alliance_id: { type: Number, sparse: true },
            },
        ],
    },
    {
        collection: "wars",
        timestamps: true,
        toJSON: {
            transform: (_doc, ret) => {
                delete ret._id;
                delete ret.__v;
            },
        },
    },
);

// Add shard key index to indexes
warsSchema.index({ war_id: "hashed" });

export const Wars: Model<IWarDocument> = model<IWarDocument>("wars", warsSchema, "wars");

// Add the sharding configuration for Wars collection
export const setupWarsSharding = async () => {
    try {
        const { enableSharding } = await import("~/server/helpers/Mongoose");
        const dbName = Wars.db.name;

        // Use hashed war_id as shard key
        const shardKey = { war_id: "hashed" } as any;

        // Ensure the shard key has an index
        await Wars.collection.createIndex(shardKey);

        // Enable sharding
        return await enableSharding(dbName, "wars", shardKey);
    } catch (error) {
        cliLogger.error(`Error setting up Wars sharding: ${error}`);
        return false;
    }
};
