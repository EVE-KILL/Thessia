import { type Document, type Model, Schema, model } from "mongoose";

// Extend the IRace interface with Mongoose's Document interface
export interface IRaceDocument extends IRace, Document {}

// Define the Races schema
const racesSchema = new Schema<IRaceDocument>(
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
                delete (ret as any).__v; // Removes __v (version key) from the JSON output
            },
        },
    }
);

// Create and export the Races model
export const Races: Model<IRaceDocument> = model<IRaceDocument>(
    "races",
    racesSchema,
    "races" // Explicitly specifying the collection name
);
