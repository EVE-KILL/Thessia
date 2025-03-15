// models/Prices.ts

import { Schema, model, type Document, type Model } from "mongoose";
import type { IPrice } from "../interfaces/IPrice"; // Adjust the path as necessary

export interface IPriceDocument extends IPrice, Document {}

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

export const Prices: Model<IPriceDocument> = model<IPriceDocument>("prices", priceSchema, "prices");
