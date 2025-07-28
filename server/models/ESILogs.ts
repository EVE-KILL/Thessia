import { type Document, type Model, Schema, model } from "mongoose";
import type { IESILog } from "~/server/interfaces/IESILog";

export interface IESILogDocument extends IESILog, Document {}

const esiLogSchema = new Schema<IESILogDocument>(
    {
        // User identification
        characterId: { type: Number, required: true, index: true },
        characterName: { type: String, required: true },

        // ESI call details
        endpoint: { type: String, required: true },

        // Data transparency
        dataType: { type: String, required: true, index: true },
        itemsReturned: { type: Number },
        killmailDelay: { type: Number }, // hours

        // Error handling
        error: { type: Boolean, default: false, index: true },
        errorMessage: { type: String },

        // Metadata
        source: { type: String, required: true, index: true },
        timestamp: { type: Date, required: true, index: true },
    },
    {
        collection: "esi_logs",
        timestamps: true,
        toJSON: {
            transform: (_doc: any, ret: any) => {
                delete ret._id;
                delete ret.__v;
            },
        },
    }
);

// Compound indexes for common queries
esiLogSchema.index({ characterId: 1, timestamp: -1 }); // User's recent activity
esiLogSchema.index({ dataType: 1, timestamp: -1 }); // Activity by data type
esiLogSchema.index({ source: 1, timestamp: -1 }); // Activity by source
esiLogSchema.index({ error: 1, timestamp: -1 }); // Error logs
esiLogSchema.index({ timestamp: -1 }); // Recent activity (for admin views)

// TTL index to automatically delete old logs after 90 days
esiLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 90 });

export const ESILogs: Model<IESILogDocument> = model<IESILogDocument>(
    "esi_logs",
    esiLogSchema
);
