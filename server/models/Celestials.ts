// models/Celestials.ts

import { Schema, model, type Document, type Model } from "mongoose";
import type { ICelestial } from "../interfaces/ICelestial"; // Adjust the path as necessary

// Extend the ICelestial interface with Mongoose's Document interface
export interface ICelestialDocument extends ICelestial, Document {}

// Define the Celestials schema
const celestialsSchema = new Schema<ICelestialDocument>(
  {
    item_id: { type: Number, unique: true }, // Unique identifier for the celestial
    constellation_id: { type: Number }, // ID of the constellation
    item_name: { type: String }, // Name of the celestial
    orbit_id: { type: Number }, // Orbit ID
    region_id: { type: Number }, // ID of the region
    region_name: { type: String }, // Name of the region
    solar_system_id: { type: Number }, // ID of the solar system
    solar_system_name: { type: String }, // Name of the solar system
    type_id: { type: Number }, // Type ID of the celestial
    type_name: { type: String }, // Type name of the celestial
    x: { type: Number }, // X coordinate
    y: { type: Number }, // Y coordinate
    z: { type: Number }, // Z coordinate
    // Timestamps are automatically added by Mongoose
  },
  {
    collection: "celestials",
    timestamps: true, // Automatically adds createdAt and updatedAt fields
    toJSON: {
      transform: (_doc, ret) => {
        delete ret._id; // Removes _id from the JSON output
        delete ret.__v; // Removes __v (version key) from the JSON output
      },
    },
  },
);

// Define indexes for the schema
celestialsSchema.index({ solar_system_id: 1 }, { sparse: true }); // Sparse index on solar_system_id
celestialsSchema.index({ region_id: 1 }, { sparse: true }); // Sparse index on region_id
celestialsSchema.index({ x: 1, y: 1, z: 1 }, { name: "x_y_z" }); // Compound index on x, y, z

// Create and export the Celestials model
export const Celestials: Model<ICelestialDocument> = model<ICelestialDocument>(
  "celestials",
  celestialsSchema,
  "celestials", // Explicitly specifying the collection name
);
