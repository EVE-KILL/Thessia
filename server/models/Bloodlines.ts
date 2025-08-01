import { type Document, type Model, Schema, model } from "mongoose";

// Extend the IBloodline interface with Mongoose's Document interface
export interface IBloodlineDocument extends IBloodline, Document {}

// Define the Bloodlines schema
const bloodlinesSchema = new Schema<IBloodlineDocument>(
    {
        bloodline_id: { type: Number, unique: true }, // Unique identifier for the bloodline
        bloodline_name: { type: String }, // Name of the bloodline
        race_id: { type: Number }, // ID of the race this bloodline belongs to
        description: { type: String }, // Description of the bloodline
        male_description: { type: String }, // Male-specific description
        female_description: { type: String }, // Female-specific description
        ship_type_id: { type: Number }, // ID of the starter ship for this bloodline
        corporation_id: { type: Number }, // ID of the corporation for this bloodline
        perception: { type: Number }, // Perception attribute value
        willpower: { type: Number }, // Willpower attribute value
        charisma: { type: Number }, // Charisma attribute value
        memory: { type: Number }, // Memory attribute value
        intelligence: { type: Number }, // Intelligence attribute value
        icon_id: { type: Number }, // ID of the icon for this bloodline
        short_description: { type: String }, // Short description
        short_male_description: { type: String }, // Short male-specific description
        short_female_description: { type: String }, // Short female-specific description
    },
    {
        collection: "bloodlines",
        timestamps: true, // Automatically adds createdAt and updatedAt fields
        toJSON: {
            transform: (_doc, ret) => {
                delete ret._id; // Removes _id from the JSON output
                delete (ret as any).__v; // Removes __v (version key) from the JSON output
            },
        },
    }
);

// Create and export the Bloodlines model
export const Bloodlines: Model<IBloodlineDocument> = model<IBloodlineDocument>(
    "bloodlines",
    bloodlinesSchema,
    "bloodlines" // Explicitly specifying the collection name
);
