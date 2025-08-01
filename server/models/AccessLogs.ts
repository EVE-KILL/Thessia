import { type Document, type Model, Schema, model } from "mongoose";

export interface IAccessLogDocument extends IAccessLog, Document {}

const accessLogSchema = new Schema<IAccessLogDocument>(
    {
        timestamp: { type: Date, required: true },
        method: { type: String, required: true },
        url: { type: String, required: true },
        httpVersion: { type: String, required: true },
        userAgent: { type: String, required: true },
        clientIp: { type: String, required: true },
        statusCode: { type: Number },
        responseTime: { type: Number }, // in milliseconds
        responseSize: { type: Number }, // in bytes
        referrer: { type: String },
        userId: { type: Number },
        endpoint: { type: String }, // Normalized endpoint
        isBot: { type: Boolean, default: false },
        isApiRequest: { type: Boolean, default: false, index: true },
    },
    {
        collection: "accessLogs",
        timestamps: false,
        expires: "2d",
        toJSON: {
            transform: (_doc: any, ret: any) => {
                delete ret._id;
                delete (ret as any).__v;
            },
        },
    }
);

// Compound indexes for common queries
accessLogSchema.index({ timestamp: -1, endpoint: 1 }); // Recent logs by endpoint
accessLogSchema.index({ timestamp: -1, clientIp: 1 }); // Recent logs by IP
accessLogSchema.index({ timestamp: -1, isBot: 1 }); // Bot vs human traffic
accessLogSchema.index({ timestamp: -1, statusCode: 1 }); // Error analysis

// TTL index for automatic cleanup after 2 days
accessLogSchema.index({ timestamp: 1 }, { expireAfterSeconds: 172800 }); // 2 days = 172800 seconds

export const AccessLogs: Model<IAccessLogDocument> = model<IAccessLogDocument>(
    "accessLogs",
    accessLogSchema,
    "accessLogs"
);
