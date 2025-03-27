// models/RequestStats.ts

import { Schema, model, type Document, type Model } from "mongoose";
import type { IRequestStats } from "~/server/interfaces/IRequestStats";

export interface IRequestStatsDocument extends IRequestStats, Document {}

const requestStatsSchema = new Schema<IRequestStatsDocument>(
  {
    ip: { type: String, required: true },
    userAgent: { type: String, required: true },
    browser: { type: String, required: false },
    os: { type: String, required: false },
    device: { type: String, required: false },
    url: { type: String, required: true },
    method: { type: String, required: true },
    statusCode: { type: Number, required: false },
    referer: { type: String, required: false },
    timestamp: { type: Date, required: true },
    updatedAt: { type: Date },
    createdAt: { type: Date },
  },
  {
    collection: "requeststats",
    timestamps: true,
    toJSON: {
      transform: (_doc, ret) => {
        delete ret._id;
        delete ret.__v;
      },
    },
  },
);

// Define indexes for better query performance
requestStatsSchema.index({ timestamp: -1 });
requestStatsSchema.index({ url: 1 });
requestStatsSchema.index({ browser: 1 });
requestStatsSchema.index({ os: 1 });

export const RequestStats: Model<IRequestStatsDocument> = model<IRequestStatsDocument>("RequestStats", requestStatsSchema, "requeststats");
