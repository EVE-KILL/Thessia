// models/Constellations.ts

import { Schema, model, type Document, type Model } from "mongoose";
import type { IConstellation } from "../interfaces/IConstellation"; // Adjust the path as necessary

// Extend the IConstellation interface with Mongoose's Document interface
export interface IConstellationDocument extends IConstellation, Document {}

// Define the Constellations schema
const constellationsSchema = new Schema<IConstellationDocument>(
  {
    region_id: { type: Number },
    constellation_id: { type: Number, unique: true },
    constellation_name: { type: String },
    x: { type: Number },
    y: { type: Number },
    z: { type: Number },
    x_min: { type: Number },
    x_max: { type: Number },
    y_min: { type: Number },
    y_max: { type: Number },
    z_min: { type: Number },
    z_max: { type: Number },
    faction_id: { type: Number },
    radius: { type: Number },
    // Timestamps are automatically added by Mongoose
  },
  {
    collection: "constellations",
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
constellationsSchema.index({ region_id: 1 }, { sparse: true });

// Create and export the Constellations model
export const Constellations: Model<IConstellationDocument> = model<IConstellationDocument>(
  "constellations",
  constellationsSchema,
  "constellations", // Explicitly specifying the collection name
);
