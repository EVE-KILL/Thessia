import { type Document, type Model, Schema, model } from "mongoose";

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
        newItemsCount: { type: Number },
        killmailDelay: { type: Number }, // hours
        fetchedData: [
            {
                id: { type: Schema.Types.Mixed, required: true }, // number or string
                hash: { type: String },
                additionalInfo: { type: Schema.Types.Mixed },
            },
        ],

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
                delete (ret as any).__v;
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

// Indexes for fetched data queries
esiLogSchema.index({ "fetchedData.id": 1 }); // Find ESI calls that fetched specific items
esiLogSchema.index({ "fetchedData.hash": 1 }); // Find ESI calls by killmail hash
esiLogSchema.index({ dataType: 1, "fetchedData.id": 1 }); // Efficient lookups within data types
esiLogSchema.index({ characterId: 1, dataType: 1, timestamp: -1 }); // User + data type queries

// TTL index to automatically delete old logs after 90 days
esiLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 90 });

export const ESILogs: Model<IESILogDocument> = model<IESILogDocument>(
    "esi_logs",
    esiLogSchema
);
