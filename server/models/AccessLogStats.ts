import { type Document, type Model, Schema, model } from "mongoose";
import type { IAccessLogStats } from "../interfaces/IAccessLogStats";

export interface IAccessLogStatsDocument extends IAccessLogStats, Document {}

const accessLogStatsSchema = new Schema<IAccessLogStatsDocument>(
    {
        date: { type: Date, required: true, index: true },
        hour: { type: Number, min: 0, max: 23, index: true }, // undefined for daily stats

        // Basic counters
        totalRequests: { type: Number, required: true, default: 0 },
        uniqueIps: { type: Number, required: true, default: 0 },
        totalErrors: { type: Number, required: true, default: 0 },
        totalBytes: { type: Number, required: true, default: 0 },

        // Performance metrics
        avgResponseTime: { type: Number, required: true, default: 0 },
        maxResponseTime: { type: Number, required: true, default: 0 },
        minResponseTime: { type: Number, required: true, default: 0 },

        // Traffic breakdown
        apiRequests: { type: Number, required: true, default: 0 },
        webRequests: { type: Number, required: true, default: 0 },
        botRequests: { type: Number, required: true, default: 0 },
        humanRequests: { type: Number, required: true, default: 0 },

        // HTTP methods breakdown
        methodBreakdown: {
            GET: { type: Number, default: 0 },
            POST: { type: Number, default: 0 },
            PUT: { type: Number, default: 0 },
            DELETE: { type: Number, default: 0 },
            PATCH: { type: Number, default: 0 },
            OPTIONS: { type: Number, default: 0 },
            HEAD: { type: Number, default: 0 },
            other: { type: Number, default: 0 },
        },

        // Status code breakdown
        statusBreakdown: {
            success: { type: Number, default: 0 }, // 2xx
            redirect: { type: Number, default: 0 }, // 3xx
            clientError: { type: Number, default: 0 }, // 4xx
            serverError: { type: Number, default: 0 }, // 5xx
        },

        // Top lists
        topEndpoints: [
            {
                url: { type: String, required: true },
                count: { type: Number, required: true },
                avgResponseTime: { type: Number, required: true },
            },
        ],

        topIps: [
            {
                ip: { type: String, required: true },
                count: { type: Number, required: true },
                isBot: { type: Boolean, required: true },
            },
        ],

        topUserAgents: [
            {
                userAgent: { type: String, required: true },
                count: { type: Number, required: true },
                isBot: { type: Boolean, required: true },
            },
        ],

        // Error samples
        errorSamples: [
            {
                url: { type: String, required: true },
                statusCode: { type: Number, required: true },
                userAgent: { type: String, required: true },
                timestamp: { type: Date, required: true },
            },
        ],

        // Metadata
        aggregationType: {
            type: String,
            enum: ["hourly", "daily"],
            required: true,
            index: true,
        },
        processedAt: { type: Date, required: true, default: Date.now },
        rawLogCount: { type: Number, required: true, default: 0 },
    },
    {
        collection: "accessLogStats",
        timestamps: false, // We manage timestamps ourselves
        toJSON: {
            transform: (_doc: any, ret: any) => {
                delete ret._id;
                delete (ret as any).__v;
            },
        },
    }
);

// Compound indexes for efficient queries
accessLogStatsSchema.index({ aggregationType: 1, date: -1 }); // Recent stats by type
accessLogStatsSchema.index({ aggregationType: 1, date: -1, hour: 1 }); // Hourly stats
accessLogStatsSchema.index({ date: -1, hour: 1 }, { sparse: true }); // Hourly lookups

export const AccessLogStats: Model<IAccessLogStatsDocument> =
    model<IAccessLogStatsDocument>(
        "accessLogStats",
        accessLogStatsSchema,
        "accessLogStats"
    );
