// models/Config.ts

import { Schema, model, type Document, type Model } from "mongoose";
import type { IConfig } from "../interfaces/IConfig"; // Adjust the path as necessary

// Extend the IConfig interface with Mongoose's Document interface
export interface IConfigDocument extends IConfig, Document {}

// Define the Config schema
const configSchema = new Schema<IConfigDocument>(
  {
    key: { type: String, unique: true },
    value: { type: String },
  },
  {
    collection: "config",
    timestamps: true, // Automatically adds createdAt and updatedAt fields
    toJSON: {
      transform: (_doc, ret) => {
        delete ret._id; // Removes _id from the JSON output
        delete ret.__v; // Removes __v (version key) from the JSON output
      },
    },
  },
);

// Create and export the Config model
export const Config: Model<IConfigDocument> = model<IConfigDocument>(
  "config",
  configSchema,
  "config", // Explicitly specifying the collection name
);
