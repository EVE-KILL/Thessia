import { type Document, type Model, Schema, model } from "mongoose";
import type { ISovereignty } from "../interfaces/ISovereignty";

// Extend the ISovereignty interface with Mongoose's Document interface
export interface ISovereigntyDocument extends ISovereignty, Document {}

// Define sub-schemas
const sovereigntyHistorySchema = new Schema(
    {
        alliance_id: { type: Number },
        alliance_name: { type: String },
        corporation_id: { type: Number },
        corporation_name: { type: String },
        faction_id: { type: Number },
        date_added: { type: Date, required: true },
    },
    { _id: false }
);

// Define the Sovereignty schema
const sovereigntySchema = new Schema<ISovereigntyDocument>(
    {
        system_id: { type: Number, required: true, unique: true },
        // Current sovereignty data
        alliance_id: { type: Number },
        alliance_name: { type: String },
        corporation_id: { type: Number },
        corporation_name: { type: String },
        faction_id: { type: Number },
        date_added: { type: Date, required: true },
        // Historical sovereignty changes
        history: { type: [sovereigntyHistorySchema], default: [] },
        updatedAt: { type: Date },
        createdAt: { type: Date },
    },
    {
        collection: "sovereignty",
        timestamps: true,
        toJSON: {
            transform: (_doc, ret) => {
                delete ret._id;
                delete (ret as any).__v;
            },
        },
    }
);

// Define indexes for the schema
sovereigntySchema.index({ alliance_id: 1 }, { sparse: true });
sovereigntySchema.index({ corporation_id: 1 }, { sparse: true });
sovereigntySchema.index({ faction_id: 1 }, { sparse: true });
sovereigntySchema.index({ date_added: 1 });
sovereigntySchema.index({ "history.date_added": 1 }, { sparse: true });

export const Sovereignty: Model<ISovereigntyDocument> =
    model<ISovereigntyDocument>(
        "sovereignty",
        sovereigntySchema,
        "sovereignty"
    );
