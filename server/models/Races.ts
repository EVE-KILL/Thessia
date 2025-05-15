import { type Document, type Model, Schema, model } from "mongoose";
import type { IRaces } from "~/server/interfaces/IRaces";

// Extend the IRaces interface with Mongoose's Document interface
export interface IRacesDocument extends IRaces, Document { }

// Define the Races schema
const racesSchema = new Schema<IRacesDocument>(
    {
        race_id: { type: Number, unique: true }, // Unique identifier for the race
        race_name: { type: String }, // Name of the race
        description: { type: String }, // Description of the race
        icon_id: { type: Number }, // ID of the icon for this race
        short_description: { type: String }, // Short description of the race
    },
    {
        collection: "races",
        timestamps: true, // Automatically adds createdAt and updatedAt fields
        toJSON: {
            transform: (_doc, ret) => {
                delete ret._id; // Removes _id from the JSON output
                delete ret.__v; // Removes __v (version key) from the JSON output
            },
        },
    },
);

// Create and export the Races model
export const Races: Model<IRacesDocument> = model<IRacesDocument>(
    "races",
    racesSchema,
    "races", // Explicitly specifying the collection name
);
